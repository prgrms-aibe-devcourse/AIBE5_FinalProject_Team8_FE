import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Check, ArrowLeft } from 'lucide-react';
import { getPlants } from './api/collection.js';
import { generateSummary, generateQuiz, saveResult, fetchResults, deleteResult } from './api/ai.js';
import { getPots } from './api/pot.js';
import { getMyTils } from './api/til.js';
import { Pill, Btn } from './ui.jsx';
import { PixelPlant, PIXEL_SPECIES } from './pixel-plants.jsx';
import { RtIcon } from './pixel-icons.jsx';
import { RootinWordmark } from './landing/RootinWordmark.jsx';
import { PixelPals } from './auth-pixel-pals.jsx';
import { playSfx } from './lib/sfx.js';
import { useUser } from './context/UserContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { inferSpecies } from './utils/plant.js';
import './dex.css';
import './ai.css';
import './profile.css';
import { SPECIES_TO_PIXEL, STAGE_KEYS, GROWTH_STAGE_TO_STAGE, TIL_MODAL_PAGE_SIZE, TIL_IDS_MAX_SIZE } from './screens-rest.logic.js';

// Collection (식물도감), AI, Profile, Auth screens

// BE speciesKey → PixelPlant species 키 매핑


// 단계별 강조색 — 올리브 LCD 팔레트 위에 단계마다 다른 게임 뱃지 톤(sprout 토큰 재사용)
const STAGE_ACCENT = {
  seed:   { bg: 'var(--amber-soft)', fg: '#9a7322',      dot: 'var(--amber)' },
  sprout: { bg: '#dbe6bb',           fg: 'var(--leaf-2)', dot: 'var(--leaf-3)' },
  leaf:   { bg: '#cfe0a8',           fg: 'var(--leaf)',   dot: 'var(--leaf-2)' },
  bloom:  { bg: 'var(--berry-soft)', fg: 'var(--berry)',  dot: 'var(--berry)' },
  full:   { bg: 'var(--sky-soft)',   fg: '#3e6580',       dot: 'var(--sky)' },
};

// 달빛 계열 밤하늘 별 좌표
const DEX_STAR_POS = [
  { l: '14%', t: '20%' }, { l: '28%', t: '14%' }, { l: '42%', t: '24%' },
  { l: '60%', t: '16%' }, { l: '74%', t: '30%' }, { l: '86%', t: '18%' },
  { l: '20%', t: '40%' }, { l: '52%', t: '38%' }, { l: '90%', t: '44%' },
];

// 흑장미 계열 떨어지는 꽃잎 (left%, 시작 지연, 낙하 시간)
const DEX_PETALS = [
  { l: '12%', d: 0,   dur: 3.6 }, { l: '24%', d: 1.1, dur: 4.4 },
  { l: '38%', d: 0.5, dur: 3.2 }, { l: '52%', d: 1.9, dur: 4.7 },
  { l: '66%', d: 0.9, dur: 3.9 }, { l: '79%', d: 2.3, dur: 4.1 },
  { l: '90%', d: 1.4, dur: 3.4 },
];

function pixelFor(speciesKey) {
  return SPECIES_TO_PIXEL[speciesKey] ?? speciesKey;
}

// ============================
// 통계 타일 (달성도)
// ============================
function DexStatTile({ icon, label, value, total, suffix = '', accent = false }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`rt-card rt-stat${accent ? ' rt-stat--accent' : ''}`}>
      <p className="rt-stat-k"><RtIcon name={icon} /> {label}</p>
      <p className="rt-stat-v">{value}<span className="unit">/ {total}{suffix}</span></p>
      <div className="gb-dex-meter"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ============================
// 희귀종 전용 배경 — 계열별 무대 연출
//   moon: 달빛 밤하늘 · bolt: 번개 폭풍 · rose: 흑장미 고딕
// ============================
function DexMoonSky() {
  return (
    <div className="gb-dex-sky gb-dex-sky--moon" aria-hidden="true">
      <span className="gb-dex-moon" />
      {DEX_STAR_POS.map((s, i) => (
        <span key={i} className="gb-dex-star" style={{ left: s.l, top: s.t, animationDelay: `${(i % 4) * 0.4}s` }} />
      ))}
    </div>
  );
}

function DexBoltSky() {
  return (
    <div className="gb-dex-sky gb-dex-sky--bolt" aria-hidden="true">
      <span className="gb-dex-flash" />
      <span className="gb-dex-cloud gb-dex-cloud--1" />
      <span className="gb-dex-cloud gb-dex-cloud--2" />
      <span className="gb-dex-zap gb-dex-zap--1" />
      <span className="gb-dex-zap gb-dex-zap--2" />
    </div>
  );
}

function DexRoseSky() {
  return (
    <div className="gb-dex-sky gb-dex-sky--rose" aria-hidden="true">
      <span className="gb-dex-rose-glow" />
      {DEX_PETALS.map((p, i) => (
        <span key={i} className="gb-dex-petal" style={{ left: p.l, animationDelay: `${p.d}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}

const DEX_RARE_SKY = { moon: DexMoonSky, bolt: DexBoltSky, rose: DexRoseSky };

function DexRareBackdrop({ speciesKey }) {
  const Sky = DEX_RARE_SKY[speciesKey] ?? DexMoonSky;
  return <Sky />;
}

// ============================
// 진화 계보 스트립 (선택 종의 5단계)
// ============================
function DexEvoStrip({ section, selectedNum, onSelect }) {
  return (
    <div className="gb-dex-evo">
      {section.entries.map((e, i) => {
        const stageKey = STAGE_KEYS[e.stageIndex] ?? 'seed';
        const active = e.dexNumber === selectedNum;
        return (
          <Fragment key={e.dexNumber}>
            <div className="gb-dex-evo-step">
              <button
                type="button"
                className={`gb-dex-evo-cell${active ? ' is-active' : ''}${e.collected ? '' : ' is-locked'}`}
                onClick={() => onSelect(e.dexNumber)}
                title={e.collected ? `${e.monName} · ${e.stageName}` : `미발견 · ${e.stageName}`}
              >
                <PixelPlant species={pixelFor(section.speciesKey)} stage={stageKey} size={32} locked={!e.collected} />
              </button>
              <span className="gb-dex-evo-label">{e.stageName}</span>
            </div>
            {i < section.entries.length - 1 && <span className="gb-dex-evo-arrow" aria-hidden="true">›</span>}
          </Fragment>
        );
      })}
    </div>
  );
}

function DexInfoRow({ label, value, muted = false }) {
  return (
    <div className="gb-dex-info-row">
      <span className="gb-dex-info-k">{label}</span>
      <span className={`gb-dex-info-v${muted ? ' is-muted' : ''}`}>{value}</span>
    </div>
  );
}

// ============================
// 좌측 뷰어 — 선택한 도감 항목 상세
// ============================
function DexViewer({ data, onSelect }) {
  if (!data) return null;
  const { entry, section } = data;
  const stageKey = STAGE_KEYS[entry.stageIndex] ?? 'seed';
  const accent = STAGE_ACCENT[stageKey];
  const rare = section.rare;
  const collected = entry.collected;
  const rareClass = rare ? ` gb-dex-screen--rare gb-dex-screen--${section.speciesKey}` : '';

  return (
    <div className="gb-dex-viewer">
      {/* 뷰어 LCD */}
      <div className={`gb-dex-screen${rareClass}`}>
        <div className="gb-dex-screen-bezel">
          <div className="gb-dex-screen-top">
            <span className="gb-garden-led" aria-hidden="true" />
            <span className="gb-dex-screen-cap">DOT&nbsp;MATRIX&nbsp;·&nbsp;DEX&nbsp;VIEWER</span>
          </div>
          <div className="gb-dex-screen-frame">
            <div className="gb-dex-lcd">
              {rare && <DexRareBackdrop speciesKey={section.speciesKey} />}
              <span className="gb-dex-noplate">No.{entry.dexNumber}</span>
              <div className="gb-dex-hero">
                <PixelPlant
                  species={pixelFor(section.speciesKey)}
                  stage={stageKey}
                  size={168}
                  locked={!collected}
                  glow={rare && collected}
                />
              </div>
              {!collected && <span className="gb-dex-qmark">?</span>}
              <div className="gb-fx gb-fx-scan" aria-hidden="true" />
              <div className="gb-fx gb-fx-vignette" aria-hidden="true" />
              <div className="gb-fx gb-fx-glass" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* 이름판 */}
      <div className="gb-dex-plate">
        <div className="gb-dex-plate-l">
          <span className="gb-dex-plate-no">No.{entry.dexNumber} · {section.speciesLabel}</span>
          <h3 className="gb-dex-plate-name">{collected ? entry.monName : '??? ??? ???'}</h3>
        </div>
        <div className="gb-dex-plate-r">
          {collected ? (
            <span className="gb-dex-stage-badge" style={{ background: accent.bg, color: accent.fg }}>
              <i style={{ background: accent.dot }} />{entry.stageName} 단계
            </span>
          ) : (
            <span className="gb-dex-stage-badge gb-dex-stage-badge--lock"><RtIcon name="lock" /> 미발견</span>
          )}
          <span className={`rt-badge ${rare ? 'rt-badge--sky' : 'rt-badge--leaf'}`}>{rare ? '✦ 희귀종' : '일반종'}</span>
        </div>
      </div>

      {/* 진화 계보 */}
      <DexEvoStrip section={section} selectedNum={entry.dexNumber} onSelect={onSelect} />

      {/* 정보 테이블 */}
      <div className="gb-dex-info">
        <DexInfoRow label="도감 번호" value={`No.${entry.dexNumber}`} />
        <DexInfoRow label="계열 범위" value={section.numRange} />
        <DexInfoRow label="등급" value={rare ? '희귀종' : '일반종'} />
        <DexInfoRow label="수확일" value={collected ? entry.harvestedAt : '미발견'} muted={!collected} />
      </div>
    </div>
  );
}

// ============================
// 우측 색인 — 도감 단일 행
// ============================
function DexListRow({ entry, speciesKey, selected, onSelect }) {
  const stageKey = STAGE_KEYS[entry.stageIndex] ?? 'seed';
  const accent = STAGE_ACCENT[stageKey];
  return (
    <button
      type="button"
      className={`gb-dex-row${selected ? ' is-active' : ''}${entry.collected ? '' : ' is-locked'}`}
      onClick={() => onSelect(entry.dexNumber)}
    >
      <span className="gb-dex-row-no">{entry.dexNumber}</span>
      <span className="gb-dex-row-sprite">
        <PixelPlant species={pixelFor(speciesKey)} stage={stageKey} size={28} locked={!entry.collected} />
      </span>
      <span className="gb-dex-row-name">{entry.collected ? entry.monName : '??????'}</span>
      {entry.collected ? (
        <span className="gb-dex-row-stage" style={{ background: accent.bg, color: accent.fg }}>{entry.stageName}</span>
      ) : (
        <span className="gb-dex-row-stage gb-dex-row-stage--lock"><RtIcon name="lock" /></span>
      )}
      <span className="gb-dex-row-check">{entry.collected && <RtIcon name="check" />}</span>
    </button>
  );
}

// ============================
// 도감 화면 — 포켓 도감 디바이스 (좌: 뷰어 / 우: 색인)
// ============================
function CollectionScreen() {
  const { user } = useUser();
  const [dex, setDex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNum, setSelectedNum] = useState(null);

  useEffect(() => {
    getPlants()
      .then(data => setDex(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = dex?.sections ?? [];
  const stats = dex?.stats;

  // 기본 선택: 첫 수집 항목 → 없으면 001
  useEffect(() => {
    if (!dex) return;
    setSelectedNum(prev => {
      if (prev) return prev;
      const all = sections.flatMap(s => s.entries);
      const firstCollected = all.find(e => e.collected);
      return firstCollected?.dexNumber ?? all[0]?.dexNumber ?? null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dex]);

  // 필터링된 섹션 (원본 수집 개수는 보존)
  const filteredSections = useMemo(() => {
    return sections.map(s => {
      const entries = filter === 'all' ? s.entries
        : filter === 'collected' ? s.entries.filter(e => e.collected)
        : s.entries.filter(e => !e.collected);
      return {
        ...s,
        entries,
        collectedCount: s.entries.filter(e => e.collected).length,
        totalCount: s.entries.length,
      };
    }).filter(s => s.entries.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dex, filter]);

  // 필터로 현재 선택이 가려지면 첫 보이는 항목으로 이동
  useEffect(() => {
    const visible = filteredSections.flatMap(s => s.entries);
    if (visible.length && !visible.some(e => e.dexNumber === selectedNum)) {
      setSelectedNum(visible[0].dexNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const selected = useMemo(() => {
    for (const s of sections) {
      const e = s.entries.find(en => en.dexNumber === selectedNum);
      if (e) return { entry: e, section: s };
    }
    return sections[0]?.entries?.[0] ? { entry: sections[0].entries[0], section: sections[0] } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dex, selectedNum]);

  // 등급별 / 완성 계열 집계
  const summary = useMemo(() => {
    let commonC = 0, rareC = 0, done = 0;
    sections.forEach(s => {
      const c = s.entries.filter(e => e.collected).length;
      if (s.rare) rareC += c; else commonC += c;
      if (s.entries.length && c === s.entries.length) done++;
    });
    return { commonC, rareC, done, speciesTotal: sections.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dex]);

  const collected = stats?.collected ?? 0;
  const total = stats?.total ?? 40;
  const commonTotal = stats?.common ?? 25;
  const rareTotal = stats?.rare ?? 15;
  const pct = total ? Math.round((collected / total) * 100) : 0;
  const visibleCount = filteredSections.reduce((n, s) => n + s.entries.length, 0);

  const selectNum = (n) => { playSfx('nav'); setSelectedNum(n); };

  return (
    <div className="rt-app gb-dex-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', minHeight: '100%' }}>

      {/* 게임 HUD 플레이어 바 */}
      <div className="rt-hud">
        <div className="rt-hud-l">
          <RtIcon name="person" /> PLAYER : {user?.name ?? '학습자'} · <span className="rt-hud-lv">도감 {pct}%</span>
        </div>
        <div className="rt-hud-r">
          <span className="rt-hud-grp"><RtIcon name="book" /> 수집 {collected}/{total}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="star" /> 희귀 {summary.rareC}/{rareTotal}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="trophy" /> 완성 {summary.done}/{summary.speciesTotal}</span>
        </div>
      </div>

      {/* 달성도 통계 타일 */}
      <div className="rt-grid rt-grid--4">
        <DexStatTile icon="book"   label="도감 수집" value={collected}      total={total}      accent />
        <DexStatTile icon="leaf"   label="일반종"   value={summary.commonC} total={commonTotal} />
        <DexStatTile icon="star"   label="희귀종"   value={summary.rareC}   total={rareTotal} />
        <DexStatTile icon="trophy" label="완성 계열" value={summary.done}    total={summary.speciesTotal} suffix="계열" />
      </div>

      {/* 게임보이 DMG 콘솔 — 포켓 도감 디바이스 */}
      <div className="gb-console gb-dex-console">
        <div className="gb-console-head">
          <div>
            <span className="rt-tag"><RtIcon name="search" /> NATIONAL DEX</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0' }}>식물 도감 · No.001–040</h2>
          </div>
          <div className="gb-dex-filters">
            {[
              { key: 'all',       label: '전체',   icon: null },
              { key: 'collected', label: '수집',   icon: 'check' },
              { key: 'locked',    label: '미수집', icon: 'lock' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                className={`gb-key ${filter === key ? 'gb-key--lcd' : 'gb-key--dark'}`}
                onClick={() => { playSfx('toggle'); setFilter(key); }}
              >
                {icon && <RtIcon name={icon} />} {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="gb-dex-loading">도감을 불러오는 중…</div>
        ) : (
          <div className="gb-dex-main">
            {/* 좌측 뷰어 */}
            <DexViewer data={selected} onSelect={selectNum} />

            {/* 우측 색인 */}
            <div className="gb-dex-index">
              <div className="gb-dex-index-head">
                <span className="rt-tag"><RtIcon name="book" /> 도감 색인</span>
                <span className="gb-dex-index-count">{visibleCount}종 표시</span>
              </div>
              <div className="gb-dex-list scrollbar">
                {filteredSections.length === 0 ? (
                  <div className="gb-dex-empty">해당 조건의 식물이 없어요.</div>
                ) : filteredSections.map(s => (
                  <div key={s.speciesKey} className="gb-dex-group">
                    <div className="gb-dex-group-head">
                      <span className="gb-dex-group-name">{s.speciesLabel}</span>
                      <span className={`rt-badge ${s.rare ? 'rt-badge--sky' : 'rt-badge--leaf'}`}>{s.rare ? '희귀' : '일반'}</span>
                      <span className="gb-dex-group-range">{s.numRange}</span>
                      <span className="gb-dex-group-count">{s.collectedCount}/{s.totalCount}</span>
                    </div>
                    {s.entries.map(e => (
                      <DexListRow
                        key={e.dexNumber}
                        entry={e}
                        speciesKey={s.speciesKey}
                        selected={e.dexNumber === selectedNum}
                        onSelect={selectNum}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 콘솔 하단 — 브랜드 각인 + 스피커 그릴 */}
        <div className="gb-console-foot">
          <div className="gb-brand">
            <span className="gb-brand-word">Rootin</span>
            <span className="gb-brand-sub">DOT-MATRIX&nbsp;DEX&nbsp;SYSTEM<span className="tm">TM</span></span>
          </div>
          <div className="gb-speaker" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// === AI Screen ===


const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * AI 학습에 포함할 TIL을 선택하는 확인 모달
 * Props:
 *   potId      — 조회할 화분 ID
 *   onConfirm  — (tilIds: number[]) => void
 *   onClose    — () => void
 */
function AiTilSelectModal({ potId, onConfirm, onClose }) {
  const [tils, setTils]               = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [partialError, setPartialError] = useState(false);
  const [keyword, setKeyword]         = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage]               = useState(0);
  const dialogRef                     = useRef(null);

  // 모달 열릴 때 포커스 이동 (스크린 리더 대응)
  useEffect(() => { dialogRef.current?.focus(); }, []);

  // Escape 키로 모달 닫기
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);


  // 진입 시 화분 TIL 전체 로딩 — 전체 페이지 순회
  useEffect(() => {
    if (!potId) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPartialError(false);
    setTotalElements(0);
    setTils([]);

    const PAGE_SIZE = 100;

    const toItem = t => ({
      id: t.tilId,
      title: t.title,
      date: t.publishedAt ?? t.createdAt,
      tags: Array.isArray(t.tags) ? [...new Set(t.tags.map(tag => String(tag).trim()).filter(Boolean))] : [],
    });

    getMyTils({ potId, page: 0, size: PAGE_SIZE, sort: 'latest', signal: controller.signal })
      .then(async first => {
        if (!active) return;
        const total = first?.totalElements ?? 0;
        const totalPages = first?.totalPages ?? 1;
        const firstContent = Array.isArray(first?.content) ? first.content : [];

        setTotalElements(total);

        if (totalPages <= 1) {
          setTils(firstContent.map(toItem));
          return;
        }

        // 나머지 페이지 병렬 fetch — allSettled로 부분 실패 시에도 성공 페이지 활용
        const rest = await Promise.allSettled(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            getMyTils({ potId, page: i + 1, size: PAGE_SIZE, sort: 'latest', signal: controller.signal })
          )
        );
        if (!active) return;

        const hadPartialFailure = rest.some(r => r.status === 'rejected');
        setPartialError(hadPartialFailure);

        const all = [
          firstContent,
          ...rest
            .filter(r => r.status === 'fulfilled')
            .map(r => Array.isArray(r.value?.content) ? r.value.content : []),
        ]
          .flat()
          .map(toItem);
        setTils(all);
      })
      .catch(() => {
        if (active) setError('TIL 목록을 불러오지 못했어요.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; controller.abort(); };
  }, [potId]);

  // 태그 목록 (빈도순)
  const tagCounts = useMemo(() => {
    const map = new Map();
    tils.forEach(t => t.tags.forEach(tag => {
      const k = tag;
      if (k) map.set(k, (map.get(k) ?? 0) + 1);
    }));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [tils]);

  // 클라이언트 필터
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tils.filter(t => {
      const matchesTag = !selectedTag || t.tags.includes(selectedTag);
      const matchesKw  = !kw || t.title.toLowerCase().includes(kw);
      return matchesTag && matchesKw;
    });
  }, [tils, keyword, selectedTag]);

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => { setPage(0); }, [keyword, selectedTag]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / TIL_MODAL_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTils    = filtered.slice(currentPage * TIL_MODAL_PAGE_SIZE, (currentPage + 1) * TIL_MODAL_PAGE_SIZE);

  // 전체 선택: 현재 필터된 TIL 전체 기준
  const allFilteredIds = useMemo(() => filtered.map(t => t.id), [filtered]);

  // allFilteredIds 단일 순회로 전체선택 관련 파생값 한 번에 계산
  const { isAllSelected, isIndeterminate, canSelectAll, addableCount } = useMemo(() => {
    const total = allFilteredIds.length;
    let selectedCount = 0;
    for (const id of allFilteredIds) {
      if (selectedIds.has(id)) selectedCount++;
    }
    const outsideSelected = selectedIds.size - selectedCount;
    return {
      isAllSelected:   total > 0 && selectedCount === total,
      isIndeterminate: selectedCount > 0 && selectedCount < total,
      canSelectAll:    outsideSelected + total <= TIL_IDS_MAX_SIZE,
      addableCount:    TIL_IDS_MAX_SIZE - outsideSelected,
    };
  }, [allFilteredIds, selectedIds]);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      // prev 기반으로 재계산 — 더블클릭 등 동일 틱 중복 호출 방어
      const isAll = allFilteredIds.length > 0 && allFilteredIds.every(id => prev.has(id));
      const next = new Set(prev);
      if (isAll) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        for (const id of allFilteredIds) {
          if (next.size >= TIL_IDS_MAX_SIZE) break;
          next.add(id);
        }
      }
      return next;
    });
  }, [allFilteredIds]);

  const toggleOne = useCallback((id) => {
    setSelectedIds(prev => {
      if (!prev.has(id) && prev.size >= TIL_IDS_MAX_SIZE) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
  };

  return (
    <div
      className="rt-app gb-ai-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-til-modal-title"
      onClick={e => { if (e.target === e.currentTarget) { playSfx('cancel'); onClose(); } }}
    >
      <div ref={dialogRef} tabIndex={-1} className="gb-ai-modal">

        {/* 헤더 */}
        <div className="gb-ai-modal-head">
          <div className="gb-ai-modal-titlewrap">
            <span className="gb-ai-modal-ic" aria-hidden="true"><RtIcon name="book" /></span>
            <div>
              <h2 id="ai-til-modal-title" className="gb-ai-modal-title">기록 불러오기</h2>
              <p className="gb-ai-modal-sub">퀴즈·요약에 사용할 기록을 골라주세요</p>
            </div>
          </div>
          <button type="button" className="gb-ai-modal-close" aria-label="닫기" onClick={() => { playSfx('cancel'); onClose(); }}><RtIcon name="xmark" /></button>
        </div>

        {/* 검색 */}
        <div className="gb-ai-modal-search">
          <span aria-hidden="true"><RtIcon name="search" /></span>
          <input
            className="gb-ai-modal-search-input"
            type="text"
            placeholder="제목으로 검색..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>

        {/* 태그 필터 */}
        {tagCounts.length > 0 && (
          <div className="gb-ai-modal-tags scrollbar">
            {tagCounts.map(([tag]) => (
              <button
                key={tag}
                type="button"
                className={`gb-ai-modal-tag${selectedTag === tag ? ' is-active' : ''}`}
                onClick={() => { playSfx('toggle'); setSelectedTag(prev => prev === tag ? null : tag); }}
              >#{tag}</button>
            ))}
          </div>
        )}

        {/* 전체 선택 + 카운트 */}
        <div className="gb-ai-modal-selbar">
          {((partialError ? tils.length : totalElements) <= TIL_IDS_MAX_SIZE || (!!(keyword.trim() || selectedTag) && filtered.length <= TIL_IDS_MAX_SIZE)) ? (
            <label className="gb-ai-modal-selall" style={{ cursor: canSelectAll ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                onChange={() => { playSfx('toggle'); toggleAll(); }}
                disabled={filtered.length === 0}
              />
              <span>{canSelectAll ? `전체 선택 (${filtered.length})` : `추가 가능한 ${addableCount}개만 선택`}</span>
            </label>
          ) : (
            <span className="gb-ai-modal-selhint">
              검색·태그로 {TIL_IDS_MAX_SIZE}개 이하로 좁히면 전체 선택할 수 있어요
            </span>
          )}
          <span className={`gb-ai-modal-count${selectedIds.size >= TIL_IDS_MAX_SIZE ? ' is-max' : ''}`}>
            {selectedIds.size} / {TIL_IDS_MAX_SIZE} 선택
          </span>
        </div>

        {/* 부분 로드 실패 안내 */}
        {partialError && (
          <div className="gb-ai-modal-warn">
            일부 기록을 불러오지 못했어요. 목록이 불완전할 수 있습니다.
          </div>
        )}

        {/* 기록 목록 */}
        <div className="gb-ai-modal-list scrollbar guide-ai-modal-list">
          {loading ? (
            <div className="gb-ai-modal-msg">기록을 불러오는 중...</div>
          ) : error ? (
            <div className="gb-ai-modal-msg is-error">{error}</div>
          ) : pageTils.length === 0 ? (
            <div className="gb-ai-modal-msg">
              {tils.length === 0 ? '이 화분에 기록이 없어요.' : '검색 결과가 없어요.'}
            </div>
          ) : (
            pageTils.map(til => (
              <label
                key={til.id}
                className={`gb-ai-til${selectedIds.has(til.id) ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(til.id)}
                  onChange={() => { playSfx('coindrop'); toggleOne(til.id); }}
                  disabled={!selectedIds.has(til.id) && selectedIds.size >= TIL_IDS_MAX_SIZE}
                />
                <span className="gb-ai-til-box" aria-hidden="true"><RtIcon name="check" /></span>
                <span className="gb-ai-til-body">
                  <span className="gb-ai-til-title">{til.title}</span>
                  <span className="gb-ai-til-meta">
                    <span className="gb-ai-til-date">{formatDate(til.date)}</span>
                    {til.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="gb-ai-til-tag">#{tag}</span>
                    ))}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="gb-ai-modal-pager">
            <button
              type="button"
              className="gb-ai-pager-btn"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="이전 페이지"
            >◀ 이전</button>
            <span className="gb-ai-pager-now">{currentPage + 1} / {totalPages}</span>
            <button
              type="button"
              className="gb-ai-pager-btn"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              aria-label="다음 페이지"
            >다음 ▶</button>
          </div>
        )}

        {/* 확인 / 취소 */}
        <div className="gb-ai-modal-foot">
          <button type="button" className="gb-ai-mbtn gb-ai-mbtn--ghost" onClick={() => { playSfx('cancel'); onClose(); }}>취소</button>
          <button
            type="button"
            className="gb-ai-mbtn gb-ai-mbtn--go guide-ai-modal-submit"
            disabled={selectedIds.size === 0}
            onClick={handleConfirm}
          >
            {selectedIds.size === 0 ? '기록을 선택해 주세요' : `${selectedIds.size}개로 만들기`}
          </button>
        </div>
      </div>
    </div>
  );
}

// growthStage → PixelPlant stage 매핑

function PotCard({ pot, selected, onClick }) {
  const species = inferSpecies(pot.plantName);
  const stage = GROWTH_STAGE_TO_STAGE[pot.growthStage] ?? 'seed';
  // TIL 개수: BE 응답의 tilCount 필드 사용, 없으면 0
  const tilCount = pot.tilCount ?? 0;

  // 정원(스테이지) 타일 — 클릭하면 분석 대상으로 선택된다
  return (
    <button type="button" onClick={onClick} className={`gb-ai-stage${selected ? ' is-active' : ''}`}>
      <span className="gb-ai-stage-pedestal" aria-hidden="true">
        <PixelPlant species={species} stage={stage} size={34} />
      </span>
      <span className="gb-ai-stage-info">
        <span className="gb-ai-stage-name">{pot.title}</span>
        <span className="gb-ai-stage-meta">
          <span className="gb-ai-stage-lv">Lv.{pot.level}</span>
          <span>기록 {tilCount}장</span>
        </span>
      </span>
      <span className="gb-ai-stage-pick" aria-hidden="true"><RtIcon name="check" /></span>
    </button>
  );
}

function AIScreen({ onOpenGuide }) {
  const { user } = useUser();
  const [mode, setMode] = useState(null); // null | quiz | summary — 선택 전엔 null (① 퀘스트 종류부터 순차 해금)
  const [resultMode, setResultMode] = useState('quiz'); // quiz | summary — 현재 표시 중인 결과 타입
  const [potId, setPotId] = useState(null);
  const [quizCount, setQuizCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // API 응답 원문 (QuizResult / SummaryResult에 전달)
  const [aiResult, setAiResult] = useState(null);
  // 에러 메시지 (null이면 에러 없음)
  const [error, setError] = useState(null);
  // 포인트 — Context의 user.points로 초기화, AI 응답의 remainPoint로 즉시 갱신
  const [remainPoint, setRemainPoint] = useState(user?.points ?? 0);

  // 화분 목록 — 진입 시 getPots()로 로딩
  const [pots, setPots] = useState([]);
  const [potsLoading, setPotsLoading] = useState(true);

  // 보관함 목록
  const [savedResults, setSavedResults] = useState([]);

  // 저장 완료 피드백용
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef(null);

  // TIL 선택 모달
  const [modalOpen, setModalOpen] = useState(false);
  // 마지막으로 선택한 tilIds (다시 생성 시 재사용)
  const [lastTilIds, setLastTilIds] = useState([]);

  const selectedPot = pots.find(p => p.id === potId) ?? null;

  useEffect(() => () => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
  }, []);

  // 이용 가이드 투어가 AI 화면 단계(.guide-ai-*)를 지날 때 화면 상태를 자동 제어한다.
  // (classic AI 화면과 동일한 rootin-guide-step 프로토콜 공유)
  // 게임보이 AI는 단계가 순차 해금되므로, 난이도·만들기 단계를 보여주려면 종류·화분이 선택돼 있어야 한다.
  useEffect(() => {
    const handleGuideStep = (e) => {
      const { action, isEnd, selector } = e.detail;
      if (isEnd) {
        setModalOpen(false);
        setAiResult(prev => {
          if (prev?.isGuideMock) {
            setGenerated(false);
            return null;
          }
          return prev;
        });
        return;
      }
      if (selector && selector.startsWith('.guide-ai-')) {
        if (action === 'ensureQuizMode') {
          setMode('quiz');
          setResultMode('quiz');
          // 화분 미선택 시 첫 화분을 채워 난이도·만들기 단계를 해금(기존 선택은 보존).
          setPotId(prev => prev ?? pots[0]?.id ?? null);
        }
        
        if (action === 'showAiGuideResult') {
          setResultMode('quiz');
          setQuizCount(2); // 예시 결과는 2문항 — 배지·안내 문구와 실제 렌더 문항 수를 일치시킴
          setGenerated(true);
          // QuizResult가 읽는 실제 응답 형태(choices·answer 문자열·hint)로 구성해야 선택지가 렌더된다.
          setAiResult({
            isGuideMock: true,
            quizzes: [
              {
                question: "🌱 Rootin에서 매일 TIL을 꾸준히 작성하면 정원에서 어떤 변화가 일어날까요?",
                choices: ["아무 일도 일어나지 않는다", "포인트가 줄어든다", "화분의 식물이 한 단계 성장한다", "새로운 화분이 무한히 생성된다"],
                answer: "화분의 식물이 한 단계 성장한다",
                hint: "TIL을 발행해 물주기를 완료하면 성장 경험치가 쌓여요.",
              },
              {
                question: "📚 AI 복습 퀴즈를 만들기 위해 필요한 것은 무엇인가요?",
                choices: ["키보드와 마우스", "충분한 보유 포인트와 작성된 TIL", "새로운 화분", "친구의 초대 링크"],
                answer: "충분한 보유 포인트와 작성된 TIL",
                hint: "활동으로 모은 포인트와 학습할 화분의 기록이 필요해요.",
              }
            ]
          });
        } else if (action !== 'showAiGuideResult') {
          // 다른 단계에서는 mock 결과 숨기기
          setAiResult(prev => {
            if (prev?.isGuideMock) {
              setGenerated(false);
              return null;
            }
            return prev;
          });
        }
        
        // TIL 선택 모달 단계에서만 모달을 열고, 그 외 단계에서는 닫는다.
        setModalOpen(action === 'openAiTilModal');
      }
    };
    window.addEventListener('rootin-guide-step', handleGuideStep);
    return () => window.removeEventListener('rootin-guide-step', handleGuideStep);
  }, [pots]);

  // 페이지 진입 시 화분 목록 + 사용자 포인트 로딩
  useEffect(() => {
    // 화분 목록 로딩 — 자동 선택하지 않음(① 퀘스트 종류 선택 후 ② 정원 단계가 해금되면 사용자가 직접 선택)
    getPots()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setPots(list);
      })
      .catch(() => {
        // 화분 목록 로딩 실패 시 빈 목록 유지
      })
      .finally(() => {
        setPotsLoading(false);
      });

    // 보유 포인트 — UserContext에서 초기화됨 (별도 getMe() 호출 불필요)
  }, []);

  // 페이지 진입 시 보관함 목록 로딩 — pot 이름은 렌더 시점에 pots에서 resolve
  useEffect(() => {
    fetchResults()
      .then(data => {
        const list = Array.isArray(data) ? data : (data.results ?? []);
        const items = list.map(r => {
          const content = typeof r.content === 'string'
            ? (() => { try { return JSON.parse(r.content); } catch { return null; } })()
            : r.content;
          const d = new Date(r.createdAt);
          return {
            id: r.resultId,
            type: r.type.toLowerCase(),   // 'QUIZ' → 'quiz'
            potId: r.potId,
            content,
            tilIds: r.tilIds ?? [],
            date: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
            quizCount: r.type === 'QUIZ' ? content?.quizzes?.length : undefined,
          };
        });
        setSavedResults(items);
      })
      .catch(() => {
        // 보관함 로딩 실패는 조용히 무시 (빈 목록 유지)
      });
  }, []);

  // 보관함 항목 클릭 — 결과창에 바인딩
  const handleSelectSavedItem = (item) => {
    setMode(item.type);
    setResultMode(item.type);
    const pot = pots.find(p => p.id === item.potId) ?? null;
    if (pot) setPotId(pot.id);
    if (item.quizCount != null) setQuizCount(item.quizCount);
    setAiResult(item.content ?? null);
    setLastTilIds(item.tilIds ?? []);
    setGenerated(true);
    setError(null);
  };

  // 생성 버튼 — mode에 따라 summary/quiz API 호출
  const handleGenerate = async (tilIds) => {
    if (!potId) return;
    setGenerating(true);
    setGenerated(false);
    setAiResult(null);
    setError(null);

    try {
      const ids = tilIds ?? lastTilIds;
      const data = mode === 'summary'
        ? await generateSummary(potId, ids)
        : await generateQuiz(potId, quizCount, ids);

      setAiResult(data);
      setRemainPoint(data.remainPoint);
      setResultMode(mode);
      setGenerated(true);
      playSfx('powerup');   // 결과 도착 — 파워업 부팅음
    } catch (err) {
      playSfx('error');     // 오류 — 경고음
      if (err.status === 402) {
        setError('포인트가 부족해요. 활동으로 포인트를 적립해 보세요.');
      } else {
        setError('생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // 모달 확인 — tilIds 받아서 생성 실행. 결제 순간 코인 분출 + 까-칭 효과음.
  const handleModalConfirm = (tilIds) => {
    setModalOpen(false);
    setLastTilIds(tilIds);
    playSfx('coin');
    handleGenerate(tilIds);
  };

  const handleModalClose = useCallback(() => setModalOpen(false), []);

  const handlePotChange = (id) => {
    setPotId(id);
    setLastTilIds([]);
  };

  // 결과 저장 버튼 — POST /ai/results
  const handleSave = async () => {
    if (!generated || !selectedPot || !aiResult) return;

    try {
      const apiType = resultMode === 'quiz' ? 'QUIZ' : 'SUMMARY';
      const saved_res = await saveResult(apiType, potId, aiResult);

      const now = new Date();
      const date = `${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      const title = resultMode === 'quiz'
        ? `${selectedPot.title} 화분 복습 문제 (${quizCount}문항)`
        : `${selectedPot.title} 화분 요약본`;

      setSavedResults(prev => [
        {
          id: saved_res.resultId,
          type: resultMode,
          potId,
          title,
          date,
          quizCount: resultMode === 'quiz' ? quizCount : undefined,
          tilIds: lastTilIds,
          pot: selectedPot,
          content: aiResult,
        },
        ...prev,
      ]);
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
      setSaved(true);
      savedTimerRef.current = setTimeout(() => {
        setSaved(false);
        savedTimerRef.current = null;
      }, 2000);
    } catch {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  // 보관함 항목 삭제 — DELETE /ai/results/{resultId}
  const handleDelete = async (e, resultId) => {
    e.stopPropagation(); // 클릭이 상위 handleSelectSavedItem으로 전파되지 않도록
    try {
      await deleteResult(resultId);
      setSavedResults(prev => prev.filter(r => r.id !== resultId));
    } catch {
      setError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  const generateCost = mode === 'quiz' ? quizCount * 10 : mode === 'summary' ? 50 : 0;
  const canGenerate = !!potId && !generating;
  const balanceAfter = remainPoint - generateCost;
  const enough = remainPoint >= generateCost;

  // ── 퀘스트 진행(표시용) — 기존 상태에서 파생, 비즈니스 로직 아님 ──
  // 순차 해금: ① 퀘스트 종류 선택 → ② 정원 해금 → 정원 선택 → ③ 난이도·④ 출격 해금
  const modeChosen = mode !== null;
  const potChosen = !!potId;
  const quizDiff = quizCount <= 3 ? { key: 'easy', label: '쉬움' }
    : quizCount <= 6 ? { key: 'normal', label: '보통' }
    : { key: 'hard', label: '어려움' };
  const questNodes = mode === 'quiz'
    ? [
        { key: 'mode', label: '종류', icon: 'spark', done: modeChosen, unlocked: true },
        { key: 'pot',  label: '화분',   icon: 'leaf',  done: potChosen, unlocked: modeChosen },
        { key: 'diff', label: '문항 수', icon: 'gear',  done: potChosen, unlocked: potChosen },
        { key: 'go',   label: '만들기',   icon: 'flame', done: generated, unlocked: potChosen },
      ]
    : [
        { key: 'mode', label: '종류', icon: 'spark', done: modeChosen, unlocked: true },
        { key: 'pot',  label: '화분',   icon: 'leaf',  done: potChosen, unlocked: modeChosen },
        { key: 'go',   label: '만들기',   icon: 'flame', done: generated, unlocked: potChosen },
      ];
  const doneCount = questNodes.filter(n => n.done).length;
  const currentNodeIdx = (() => {
    const i = questNodes.findIndex(n => !n.done);
    return i === -1 ? questNodes.length - 1 : i;
  })();
  const heroSpecies = inferSpecies(selectedPot?.plantName);
  const objective = generating
    ? 'AI가 기록을 분석하는 중...'
    : generated
      ? '완성됐어요! 결과를 확인하세요'
      : !modeChosen
        ? '먼저 만들 종류를 선택하세요'
        : !potChosen
          ? '화분을 선택하세요'
          : !enough
            ? '포인트가 부족해요 — 활동으로 모아보세요'
            : '만들기 버튼을 눌러 시작하세요!';

  return (
    <>
    <div className="rt-app gb-ai-page">
      <div className="gb-console">

        {/* ===== 콘솔 헤드: 카트리지 라벨 · 타이틀 · 코인 HUD ===== */}
        <div className="gb-ai-head">
          <div className="gb-ai-id">
            <span className="gb-ai-cart" aria-hidden="true"><RtIcon name="spark" /></span>
            <div className="gb-ai-titles">
              <span className="gb-ai-kicker"><RtIcon name="book" /> 기록으로 만드는 복습 자료</span>
              <h1 className="gb-ai-title">AI 복습 도우미</h1>
            </div>
          </div>
          <div className={`gb-ai-credit${enough ? '' : ' is-low'}`}>
            <span className="gb-ai-coin" aria-hidden="true">P</span>
            <span className="gb-ai-credit-meta">
              <span className="gb-ai-credit-k">보유 포인트</span>
              <span className="gb-ai-credit-v">{remainPoint}P</span>
            </span>
          </div>
        </div>

        {/* ===== HUD 목표 바 — 현재 퀘스트 목표 + 진행도 ===== */}
        <div className="gb-ai-objbar">
          <span className="gb-ai-obj-flag" aria-hidden="true"><RtIcon name="flame" /></span>
          <span className="gb-ai-obj-text">목표 ▸ <span className="cur">{objective}</span></span>
          <span className="gb-ai-progress" aria-hidden="true">
            {questNodes.map((n, i) => (<i key={n.key} className={i < doneCount ? 'on' : ''} />))}
          </span>
        </div>

        {/* ===== 본문: 좌 퀘스트 타임라인 / 우 플레이 스크린 ===== */}
        <div className="gb-ai-main">

          {/* ── 좌: 퀘스트 타임라인 (진행 흐름) ── */}
          <ol className="gb-ai-quest">
            {questNodes.map((n, i) => (
              <li key={n.key} className={`gb-ai-node${n.done ? ' is-done' : ''}${i === currentNodeIdx ? ' is-current' : ''}${!n.unlocked ? ' is-locked' : ''}`}>
                <div className="gb-ai-rail">
                  <span className="gb-ai-mark" aria-hidden="true">
                    {!n.unlocked ? <RtIcon name="lock" /> : n.done ? <RtIcon name="check" /> : i === currentNodeIdx ? <RtIcon name={n.icon} /> : (i + 1)}
                  </span>
                </div>
                <div className="gb-ai-node-body rt-card">
                  {!n.unlocked ? (
                    <div className="gb-ai-locked">
                      <span className="gb-ai-locked-ic" aria-hidden="true"><RtIcon name="lock" /></span>
                      <span className="gb-ai-locked-t">{n.label} 단계 · 잠김</span>
                      <span className="gb-ai-locked-d">{n.key === 'pot' ? '먼저 종류를 선택하세요' : '먼저 화분을 선택하세요'}</span>
                    </div>
                  ) : (<div className="gb-ai-node-content" key={`${n.key}-open`}>

                  {n.key === 'mode' && (
                    <>
                      <div className="gb-ai-node-head"><span className="gb-ai-node-title">종류 선택</span><span className="gb-ai-node-sub">무엇을 만들까요?</span></div>
                      <div className="gb-ai-intent guide-ai-mode">
                        <button type="button" className={`gb-ai-quest-opt${mode === 'quiz' ? ' is-active' : ''}`} onClick={() => { playSfx('toggle'); setMode('quiz'); }}>
                          <span className="gb-ai-quest-ic" aria-hidden="true"><RtIcon name="check" /></span>
                          <span className="gb-ai-quest-t">복습 퀴즈</span>
                          <span className="gb-ai-quest-d">4지선다로 이해도 점검</span>
                        </button>
                        <button type="button" className={`gb-ai-quest-opt${mode === 'summary' ? ' is-active' : ''}`} onClick={() => { playSfx('toggle'); setMode('summary'); }}>
                          <span className="gb-ai-quest-ic" aria-hidden="true"><RtIcon name="star" /></span>
                          <span className="gb-ai-quest-t">핵심 요약</span>
                          <span className="gb-ai-quest-d">한 편의 정리 노트로</span>
                        </button>
                      </div>
                    </>
                  )}

                  {n.key === 'pot' && (
                    <>
                      <div className="gb-ai-node-head"><span className="gb-ai-node-title">화분 선택</span><span className="gb-ai-node-sub">{selectedPot ? selectedPot.title : '선택 필요'}</span></div>
                      <div className="gb-ai-stages scrollbar guide-ai-pots">
                        {potsLoading ? (
                          <div className="gb-ai-msg">화분 목록을 불러오는 중...</div>
                        ) : pots.length === 0 ? (
                          <div className="gb-ai-msg">화분이 없어요. 먼저 화분을 만들어 보세요.</div>
                        ) : (
                          pots.map(p => (
                            <PotCard
                              key={p.id}
                              pot={p}
                              selected={potId === p.id}
                              onClick={() => { playSfx('nav'); handlePotChange(p.id); }}
                            />
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {n.key === 'diff' && (
                    <>
                      <div className="gb-ai-node-head"><span className="gb-ai-node-title">문항 수</span><span className="gb-ai-node-sub">최대 10문제</span></div>
                      <div className="gb-ai-dial guide-ai-quiz-count">
                        <button type="button" className="gb-ai-dial-btn" onClick={() => setQuizCount(n2 => Math.max(1, n2 - 1))} disabled={quizCount <= 1} aria-label="문항 줄이기">−</button>
                        <div className="gb-ai-dial-screen">
                          <span className="gb-ai-dial-val">{quizCount}<span className="unit">문항</span></span>
                          <span className="gb-ai-diff" data-diff={quizDiff.key}>{quizDiff.label}</span>
                        </div>
                        <button type="button" className="gb-ai-dial-btn" onClick={() => setQuizCount(n2 => Math.min(10, n2 + 1))} disabled={quizCount >= 10} aria-label="문항 늘리기">+</button>
                      </div>
                    </>
                  )}

                  {n.key === 'go' && (
                    <>
                      <div className="gb-ai-node-head"><span className="gb-ai-node-title">만들기</span><span className="gb-ai-node-sub">필요 포인트 {generateCost}P</span></div>
                      <div className="gb-ai-ledger">
                        <span className="gb-ai-ledger-row"><span>보유 포인트</span><b>{remainPoint}P</b></span>
                        <span className="gb-ai-ledger-row is-cost"><span>이번 사용</span><b>− {generateCost}P</b></span>
                        <span className="gb-ai-ledger-row is-total"><span>사용 후 잔여</span><b>{balanceAfter}P</b></span>
                      </div>
                      {!enough && <div className="gb-ai-warn"><RtIcon name="lock" /> 포인트가 부족해요. 활동으로 포인트를 모아보세요.</div>}
                      <button
                        type="button"
                        className={`gb-ai-start guide-ai-select-til${canGenerate && enough ? ' is-ready' : ''}`}
                        onClick={() => { if (canGenerate) { playSfx('confirm'); setModalOpen(true); } }}
                        disabled={!canGenerate}
                      >
                        <span className="gb-ai-start-ic" aria-hidden="true">A</span>
                        <span>{generating ? '만드는 중…' : '만들기'}</span>
                        <span className="gb-ai-start-cost">{generateCost}P</span>
                      </button>
                    </>
                  )}
                  </div>)}
                </div>
              </li>
            ))}
          </ol>

          {/* ── 우: 플레이 스크린 (LCD) ── */}
          <section className="gb-ai-screen guide-ai-result">
            <div className="gb-ai-bezel">
              <div className="gb-ai-bez-top">
                <span className={`gb-ai-led${generated && !generating ? ' is-on' : ''}`} aria-hidden="true" />
                <span className="gb-ai-bez-cap">{mode === 'quiz' ? '복습 퀴즈' : mode === 'summary' ? '핵심 요약' : '대기 중'}</span>
                <span className="gb-ai-bez-cap r">ROOTIN-AI</span>
              </div>
              <div className="gb-ai-frame">
                <div className="gb-ai-lcd">
                  {generating ? (
                    <div className="gb-ai-explore">
                      <span className="gb-ai-explore-hero" aria-hidden="true"><PixelPlant species={heroSpecies} stage="sprout" size={56} /></span>
                      <div className="gb-ai-explore-t">{mode === 'quiz' ? '복습 퀴즈 만드는 중' : '핵심 요약 만드는 중'}</div>
                      <div className="gb-ai-loadbar" aria-hidden="true"><i /></div>
                      <div className="gb-ai-explore-sub">AI가 기록을 분석하고 있어요...</div>
                    </div>
                  ) : generated ? (
                    <div className="gb-ai-result">
                      <div className="gb-ai-clear">
                        <span className="gb-ai-clear-badge">{resultMode === 'quiz' ? `${quizCount}문항` : '요약'}</span>
                        <span className="gb-ai-clear-title">{resultMode === 'quiz' ? '복습 퀴즈가 완성됐어요' : '핵심 요약이 완성됐어요'}</span>
                        <div className="gb-ai-clear-acts">
                          {lastTilIds.length > 0 && (
                            <button type="button" className="gb-ai-act" onClick={() => handleGenerate(lastTilIds)}>다시 만들기</button>
                          )}
                          <button type="button" className="gb-ai-act gb-ai-act--save" onClick={handleSave}>{saved ? '✓ 저장됨' : '저장하기'}</button>
                        </div>
                      </div>
                      <div className="gb-ai-result-body scrollbar">
                        {error && <div className="gb-ai-strip"><RtIcon name="lock" />{error}</div>}
                        {resultMode === 'quiz' ? (
                          <QuizResult pot={selectedPot} quizCount={quizCount} quizzes={aiResult?.quizzes ?? null} />
                        ) : (
                          <SummaryResult pot={selectedPot} summary={aiResult?.summary ?? null} keyPoints={aiResult?.keyPoints ?? null} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="gb-ai-standby">
                      <div className="gb-ai-gate" aria-hidden="true">
                        <span className="gb-ai-gate-hero"><PixelPlant species={heroSpecies} stage="sprout" size={56} /></span>
                      </div>
                      <div className="gb-ai-standby-t">시작 대기 중</div>
                      <div className="gb-ai-standby-sub">화분과 종류를 선택하고 만들기를 누르면, 기록을 분석해 복습 퀴즈나 핵심 요약을 만들어 드려요.</div>
                      <div className="gb-ai-press">▶ 만들기 버튼을 눌러 시작</div>
                      {error && <div className="gb-ai-strip" style={{ marginTop: 4 }}><RtIcon name="lock" />{error}</div>}
                    </div>
                  )}
                  <span className="gb-fx gb-fx-scan" aria-hidden="true" />
                  <span className="gb-fx gb-fx-vignette" aria-hidden="true" />
                  <span className="gb-fx gb-fx-glass" aria-hidden="true" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ===== 전리품 보관함 ===== */}
        <section className="gb-ai-vault guide-ai-saved-results">
          <div className="gb-ai-vault-head">
            <RtIcon name="trophy" />
            <span className="gb-ai-vault-title">저장한 학습 자료</span>
            <span className="gb-ai-vault-count">{savedResults.length}개</span>
          </div>
          {savedResults.length === 0 ? (
            <div className="gb-ai-vault-empty">아직 저장한 자료가 없어요. 결과를 만들고 저장해 보세요.</div>
          ) : (
            <div className="gb-ai-vault-grid">
              {savedResults.map(item => {
                const itemPot = pots.find(p => p.id === item.potId);
                const itemTitle = item.title ?? (item.type === 'quiz'
                  ? `${itemPot?.title ?? item.potId} 화분 복습 문제`
                  : `${itemPot?.title ?? item.potId} 화분 요약본`);
                return (
                  <article key={item.id} className="gb-ai-loot" onClick={() => { playSfx('nav'); handleSelectSavedItem(item); }}>
                    <span className={`gb-ai-loot-ic ${item.type === 'quiz' ? 'is-quiz' : 'is-summary'}`} aria-hidden="true">
                      <RtIcon name={item.type === 'quiz' ? 'check' : 'star'} />
                    </span>
                    <span className="gb-ai-loot-body">
                      <span className="gb-ai-loot-title">{itemTitle}</span>
                      <span className="gb-ai-loot-meta">{item.type === 'quiz' ? '복습 퀴즈' : '핵심 요약'} · {item.date}</span>
                    </span>
                    <button type="button" className="gb-ai-loot-del" aria-label="삭제" onClick={(e) => handleDelete(e, item.id)}><RtIcon name="xmark" /></button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== 콘솔 발 — 브랜드 + 스피커 ===== */}
        <div className="gb-console-foot">
          <div className="gb-brand">
            <span className="gb-brand-word">Rootin</span>
            <span className="gb-brand-sub">AI 복습 도우미</span>
          </div>
          <span className="gb-speaker" aria-hidden="true" />
        </div>
      </div>
    </div>

    {modalOpen && (
      <AiTilSelectModal
        potId={potId}
        onConfirm={handleModalConfirm}
        onClose={handleModalClose}
      />
    )}
    </>
  );
}

function QuizResult({ pot, quizCount, quizzes }) {
  const list = quizzes ?? [];
  // { [index]: choiceText }
  const [selected, setSelected] = useState({});
  const [graded, setGraded] = useState(false);

  const allAnswered = list.length > 0 && Object.keys(selected).length === list.length;
  const correctCount = graded
    ? list.filter((q, i) => selected[i] === q.answer).length
    : 0;

  function handleSelect(idx, choice) {
    if (graded) return;
    setSelected(prev => ({ ...prev, [idx]: choice }));
  }

  function handleGrade() {
    setGraded(true);
  }

  // 채점 전/후 보기 상태 클래스
  function choiceClass(q, i, choice) {
    if (!graded) return selected[i] === choice ? ' is-selected' : '';
    if (choice === q.answer) return ' is-correct';
    if (selected[i] === choice) return ' is-wrong';
    return ' is-dim';
  }

  // 채점 결과 별점(표시용) — 정답률을 5칸으로 환산
  const starCount = list.length ? Math.round((correctCount / list.length) * 5) : 0;
  const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

  return (
    <div className="gb-ai-quiz">
      <p className="gb-ai-quiz-intro">
        {pot?.title ? `'${pot.title}' 화분의 ` : ''}기록에서 {quizCount}개의 문제를 만들었어요. 정답을 고른 뒤 채점해 보세요.
      </p>

      {list.map((q, i) => (
        <div key={i} className="gb-ai-q">
          <div className="gb-ai-q-head">
            <span className="gb-ai-q-no">Q{i + 1}</span>
            <span className="gb-ai-q-text">{q.question}</span>
          </div>
          {q.hint && <div className="gb-ai-q-hint"><RtIcon name="drop" />힌트 · {q.hint}</div>}
          <div className="gb-ai-choices">
            {(q.choices ?? []).map((choice, ci) => (
              <button
                key={ci}
                type="button"
                className={`gb-ai-choice${choiceClass(q, i, choice)}`}
                onClick={() => handleSelect(i, choice)}
                disabled={graded}
              >
                <span className="gb-ai-choice-mk" aria-hidden="true">{['A', 'B', 'C', 'D'][ci] ?? '·'}</span>
                <span className="gb-ai-choice-text">{choice}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {list.length > 0 && (
        <div className="gb-ai-quiz-foot">
          {graded && (
            <div className={`gb-ai-score${correctCount === list.length ? ' is-perfect' : ''}`}>
              <span className="gb-ai-score-stars" aria-hidden="true">{stars}</span>
              <span>{correctCount === list.length
                ? `${list.length}문제 모두 정답이에요! 완벽해요.`
                : `${list.length}문제 중 ${correctCount}개 정답!`}</span>
            </div>
          )}
          <button
            type="button"
            className="gb-ai-btn"
            onClick={handleGrade}
            disabled={!allAnswered || graded}
          >
            {graded ? '채점 완료' : '채점하기'}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryResult({ pot, summary, keyPoints }) {
  return (
    <div className="gb-ai-summary">
      <p className="gb-ai-summary-intro">
        {pot?.title ? `'${pot.title}' 화분의 ` : ''}기록을 한 편으로 정리했어요.
      </p>

      {summary && <div className="gb-ai-summary-body">{summary}</div>}

      {keyPoints && keyPoints.length > 0 && (
        <div className="gb-ai-keypoints">
          <div className="gb-ai-keypoints-cap"><RtIcon name="star" /> 핵심 포인트</div>
          <ul className="gb-ai-keypoints-list">
            {keyPoints.map((point, i) => (
              <li key={i} className="gb-ai-keypoint"><span className="gb-ai-kp-mk" aria-hidden="true">{i + 1}</span>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// === Profile Screen ===

const THEME_OPTIONS = [
  { id: 'classic', emoji: '🌿', name: '원본', desc: '깔끔한 식물 테마' },
  { id: 'gameboy', emoji: '🎮', name: '게임보이', desc: '레트로 픽셀 콘솔' },
];

function ProfileScreen() {
  const { user, updateUser, clearUser } = useUser();
  const { theme, setTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [harvestedCount, setHarvestedCount] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const fileInputRef = useRef(null);

  // 비밀번호 변경 폼 상태
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwStep, setPwStep] = useState('form'); // 'form' | 'confirm'
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  // user가 비동기로 로드된 후 입력 상태 동기화
  useEffect(() => {
    if (user && !editing) {
      setNickname(user.name ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  // 수확한 식물 수 조회
  useEffect(() => {
    getPlants()
      .then(data => setHarvestedCount(data?.stats?.collected ?? 0))
      .catch(() => setHarvestedCount(0));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const { patchUserMe } = await import('./api/user.js');
      await patchUserMe({ nickname, bio });
      updateUser({ name: nickname, bio });
      setEditing(false);
    } catch (err) {
      setSaveError(err?.body?.message ?? '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const { getProfileImagePresignedUrl, patchUserMe } = await import('./api/user.js');
      const { presignedUrl, fileUrl } = await getProfileImagePresignedUrl({
        filename: file.name,
        fileSize: file.size,
      });

      // LocalStack 환경에서는 Docker 내부 호스트 → 브라우저 접근 가능한 주소로 치환
      const replaceLocalstackHost = (url) => {
        const endpoint = import.meta.env.VITE_LOCALSTACK_ENDPOINT;
        return endpoint ? url.replace(endpoint, 'http://localhost:4566') : url;
      };

      const uploadUrl = replaceLocalstackHost(presignedUrl);
      const displayUrl = replaceLocalstackHost(fileUrl);

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // 서버에 profileImageUrl 저장 (nickname은 @NotBlank 필수값이므로 같이 전송)
      await patchUserMe({ nickname, bio, profileImageUrl: displayUrl });
      console.log('[이미지 업로드 완료] displayUrl:', displayUrl);
      updateUser({ profileImageUrl: displayUrl });
    } catch (err) {
      console.error('[이미지 업로드 실패]', err);
      alert('이미지 업로드에 실패했습니다: ' + (err?.message ?? err));
    } finally {
      setImageUploading(false);
    }
  }

  async function handleWithdraw() {
    if (!window.confirm('정말 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.')) return;
    setWithdrawing(true);
    try {
      const { deleteUserMe } = await import('./api/user.js');
      await deleteUserMe();
      clearUser();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.reload();
    } catch {
      alert('회원 탈퇴에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setWithdrawing(false);
    }
  }

  function handlePasswordFormCancel() {
    setShowPasswordForm(false);
    setPwStep('form');
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwError(null);
  }

  function handlePasswordNext() {
    setPwError(null);
    if (!pwCurrent) { setPwError('현재 비밀번호를 입력해주세요.'); return; }
    if (pwNew.length < 8) { setPwError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (pwNew !== pwConfirm) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    setPwStep('confirm');
  }

  async function handlePasswordConfirm() {
    setPwError(null);
    setPwSaving(true);
    try {
      const { patchPassword } = await import('./api/user.js');
      await patchPassword({ currentPassword: pwCurrent, newPassword: pwNew, confirmPassword: pwConfirm });
      clearUser();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.reload();
    } catch (err) {
      setPwError(err?.body?.message ?? '비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
      setPwStep('form');
    } finally {
      setPwSaving(false);
    }
  }

  const provider = user?.provider?.toUpperCase() ?? null;
  const isLocal = provider === 'LOCAL';

  // 프로필 이미지: URL 있으면 img, 없으면 이니셜
  const avatarInitial = (user?.name ?? '?')[0];
  const profileImageUrl = user?.profileImageUrl ?? null;

  return (
    <div className="rt-app gb-profile-page">

      {/* 게임 HUD 플레이어 바 */}
      <div className="rt-hud">
        <div className="rt-hud-l">
          <RtIcon name="person" /> PLAYER : {nickname || '학습자'} · <span className="rt-hud-lv">SAVE FILE 01</span>
        </div>
        <div className="rt-hud-r">
          <span className="rt-hud-grp"><RtIcon name="clock" /> {user?.joinedAt ? `${user.joinedAt}~` : '모험 진행 중'}</span>
          <span className="rt-hud-sep" />
          <span className="rt-hud-grp"><RtIcon name="star" /> {user?.points ?? 0}P</span>
        </div>
      </div>

      {/* ===== 플레이어 데이터 콘솔 (세이브 파일) ===== */}
      <div className="gb-console gb-profile-console">
        <div className="gb-console-head">
          <div>
            <span className="rt-tag"><RtIcon name="person" /> SAVE FILE · PLAYER DATA</span>
            <h2 className="rt-h3" style={{ margin: '10px 0 0' }}>플레이어 프로필</h2>
          </div>
          {!editing && (
            <button className="rt-btn rt-btn--sm" onClick={() => { playSfx('nav'); setEditing(true); }}>
              <RtIcon name="gear" /> 프로필 수정
            </button>
          )}
        </div>

        <div className="gb-prof-main">

          {/* ── 좌: 캐릭터 LCD (보기) / 프로필 폼 (편집) ── */}
          <div className="gb-prof-screen">
            <div className="gb-prof-bezel">
              <div className="gb-prof-beztop">
                <span className="gb-garden-led" aria-hidden="true" />
                <span className="gb-prof-cap">{editing ? 'EDIT MODE · 프로필 편집' : 'DOT MATRIX · CHARACTER'}</span>
              </div>
              <div className="gb-prof-frame">
                <div className="gb-prof-lcd">

                  {editing ? (
                    /* ----- 편집 폼 ----- */
                    <div className="gb-prof-form">
                      <div className="gb-prof-avatar-row">
                        <div className="gb-prof-avatar">
                          <img
                            src={profileImageUrl || ''}
                            alt="프로필"
                            className="gb-prof-avatar-img"
                            style={{ display: profileImageUrl ? 'block' : 'none' }}
                            onError={e => { e.currentTarget.style.display = 'none'; document.getElementById('avatar-initial-edit').style.display = 'flex'; }}
                          />
                          <div id="avatar-initial-edit" className="gb-prof-avatar-fallback" style={{ display: profileImageUrl ? 'none' : 'flex' }}>{avatarInitial}</div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                            data-testid="profile-image-input"
                          />
                          <button
                            className="gb-prof-cam"
                            disabled={imageUploading}
                            onClick={() => fileInputRef.current?.click()}
                            aria-label="프로필 이미지 변경"
                          >
                            {imageUploading ? '…' : <RtIcon name="plus" />}
                          </button>
                        </div>
                        <span className="gb-prof-avatar-hint">이미지를 클릭해 변경하세요</span>
                      </div>

                      <label className="gb-prof-field">
                        <span className="gb-prof-field-k">닉네임</span>
                        <input
                          className="gb-prof-input"
                          value={nickname}
                          onChange={e => setNickname(e.target.value)}
                        />
                      </label>

                      <label className="gb-prof-field">
                        <span className="gb-prof-field-k">소개</span>
                        <textarea
                          className="gb-prof-textarea"
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                        />
                      </label>

                      <div className="gb-prof-form-actions">
                        <button className="rt-btn rt-btn--primary" onClick={() => { playSfx('confirm'); handleSave(); }} disabled={saving}>
                          {saving ? '저장 중…' : '저장'}
                        </button>
                        <button className="rt-btn rt-btn--ghost" onClick={() => { playSfx('cancel'); setEditing(false); setSaveError(null); setNickname(user?.name ?? ''); setBio(user?.bio ?? ''); }} disabled={saving}>
                          취소
                        </button>
                        {saveError && <span className="gb-prof-err">{saveError}</span>}
                      </div>
                    </div>
                  ) : (
                    /* ----- 캐릭터 카드 ----- */
                    <div className="gb-prof-card">
                      <div className="gb-prof-portrait">
                        <img
                          src={profileImageUrl || ''}
                          alt="프로필"
                          className="gb-prof-portrait-img"
                          style={{ display: profileImageUrl ? 'block' : 'none' }}
                          onError={e => { e.currentTarget.style.display = 'none'; document.getElementById('avatar-initial-view').style.display = 'flex'; }}
                        />
                        <div id="avatar-initial-view" className="gb-prof-portrait-fallback" style={{ display: profileImageUrl ? 'none' : 'flex' }}>{avatarInitial}</div>
                      </div>
                      <div className="gb-prof-id">
                        <h3 className="gb-prof-name">{nickname}</h3>
                        <span className="gb-prof-handle">@{user?.handle ?? ''}</span>
                        <p className="gb-prof-bio">{bio || '아직 소개가 없어요.'}</p>
                        <span className="gb-prof-since">
                          <RtIcon name="clock" /> {user?.joinedAt ? `${user.joinedAt}부터 ` : ''}Rootin과 함께
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="gb-fx gb-fx-scan" aria-hidden="true" />
                  <div className="gb-fx gb-fx-vignette" aria-hidden="true" />
                  <div className="gb-fx gb-fx-glass" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

          {/* ── 우: STATUS 스탯 패널 ── */}
          <div className="gb-prof-status">
            <div className="gb-prof-status-head">
              <span className="rt-tag"><RtIcon name="trophy" /> STATUS</span>
            </div>
            <ul className="gb-prof-stats">
              {[
                { icon: 'book',  k: '누적 TIL',    v: (user?.totalTil ?? 0) + '개', tone: 'leaf' },
                { icon: 'flame', k: '연속 기록',   v: (user?.streak ?? 0) + '일', tone: 'peach' },
                { icon: 'leaf',  k: '수확한 식물', v: harvestedCount !== null ? harvestedCount + '종' : '—', tone: 'sky' },
                { icon: 'star',  k: '보유 포인트', v: (user?.points ?? 0) + 'P', tone: 'amber' },
              ].map((s) => (
                <li key={s.k} className={`gb-prof-stat gb-prof-stat--${s.tone}`}>
                  <span className="gb-prof-stat-ic"><RtIcon name={s.icon} /></span>
                  <span className="gb-prof-stat-k">{s.k}</span>
                  <span className="gb-prof-stat-v">{s.v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 콘솔 하단 — 브랜드 각인 + 스피커 그릴 */}
        <div className="gb-console-foot">
          <div className="gb-brand">
            <span className="gb-brand-word">Rootin</span>
            <span className="gb-brand-sub">DOT-MATRIX&nbsp;SAVE&nbsp;SYSTEM<span className="tm">TM</span></span>
          </div>
          <div className="gb-speaker" aria-hidden="true" />
        </div>
      </div>

      {/* ===== 계정 관리 ===== */}
      <div className="rt-card gb-prof-acct">
        <div className="gb-prof-acct-head">
          <span className="rt-tag"><RtIcon name="gear" /> 계정 관리</span>
          <h3 className="rt-h3" style={{ margin: '8px 0 0' }}>설정</h3>
        </div>

        {/* 이메일 행 */}
        <div className="gb-acct-row">
          <span className="gb-acct-k">이메일</span>
          <span className="gb-acct-v">{user?.email ?? ''}</span>
        </div>

        {/* 비밀번호 행 — local 유저만 */}
        {isLocal && (
          <div className="gb-acct-row">
            <span className="gb-acct-k">비밀번호</span>
            <span className="gb-acct-v">••••••••</span>
            <button className="rt-btn rt-btn--sm" onClick={() => { playSfx('nav'); setShowPasswordForm(true); }}>변경</button>
          </div>
        )}
      </div>

      {/* 테마 보관함 — 카트리지 컬렉션 */}
      <div className="rt-card gb-prof-theme">
        <div className="gb-prof-acct-head">
          <span className="rt-tag"><RtIcon name="star" /> 화면 테마</span>
          <h3 className="rt-h3" style={{ margin: '8px 0 0' }}>테마 보관함</h3>
        </div>
        <div className="gb-theme-grid">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`gb-theme-cart${active ? ' is-active' : ''}`}
                onClick={() => { playSfx('nav'); setTheme(opt.id); }}
                aria-pressed={active}
              >
                <span className="gb-theme-cart-emoji">{opt.emoji}</span>
                <span className="gb-theme-cart-name">{opt.name}</span>
                <span className="gb-theme-cart-desc">{opt.desc}</span>
                <span className="gb-theme-cart-badge">{active ? '● 장착됨' : '○ 선택'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 회원 탈퇴 */}
      <div className="gb-prof-danger-row">
        <button className="gb-prof-danger" onClick={handleWithdraw} disabled={withdrawing}>
          <RtIcon name="xmark" /> {withdrawing ? '처리 중…' : '회원 탈퇴'}
        </button>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordForm && (
        <div className="gb-pw-overlay" onClick={handlePasswordFormCancel}>
          <div className="gb-pw-modal" onClick={e => e.stopPropagation()}>
            <div className="gb-pw-bar">
              <span className="gb-garden-led" aria-hidden="true" />
              <span className="gb-pw-cap">ACCOUNT&nbsp;·&nbsp;SECURITY</span>
            </div>
            <div className="gb-pw-body">
              <span className="rt-tag"><RtIcon name="lock" /> 계정 관리</span>
              <h3 className="gb-pw-title">비밀번호 변경</h3>

              {pwStep === 'form' ? (
                <>
                  <div className="gb-pw-fields">
                    {[
                      { label: '현재 비밀번호', value: pwCurrent, setter: setPwCurrent },
                      { label: '새 비밀번호', value: pwNew, setter: setPwNew },
                      { label: '새 비밀번호 확인', value: pwConfirm, setter: setPwConfirm },
                    ].map(({ label, value, setter }) => (
                      <label key={label} className="gb-pw-field">
                        <span className="gb-pw-label">{label}</span>
                        <input
                          type="password"
                          className="gb-pw-input"
                          value={value}
                          onChange={e => setter(e.target.value)}
                        />
                      </label>
                    ))}
                  </div>

                  {pwError && <div className="gb-pw-error">{pwError}</div>}

                  <div className="gb-pw-actions">
                    <button className="rt-btn rt-btn--ghost" onClick={() => { playSfx('cancel'); handlePasswordFormCancel(); }}>
                      취소
                    </button>
                    <button className="rt-btn rt-btn--primary" onClick={() => { playSfx('nav'); handlePasswordNext(); }}>
                      비밀번호 변경
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="gb-pw-confirm">
                    정말 비밀번호를 변경하시겠습니까?<br />
                    <span className="gb-pw-confirm-sub">변경 후에는 새 비밀번호로 다시 로그인해야 합니다.</span>
                  </div>

                  {pwError && <div className="gb-pw-error">{pwError}</div>}

                  <div className="gb-pw-actions">
                    <button className="rt-btn rt-btn--ghost" onClick={() => { setPwStep('form'); setPwError(null); }} disabled={pwSaving}>
                      아니요
                    </button>
                    <button className="rt-btn rt-btn--primary" onClick={() => { playSfx('confirm'); handlePasswordConfirm(); }} disabled={pwSaving}>
                      {pwSaving ? '변경 중…' : '변경합니다'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Auth Screen ===

// 클라이언트 유효성 검사
function validate({ mode, email, password, nickname }) {
  if (mode === 'signup' && !nickname.trim()) return '닉네임을 입력해주세요.';
  if (!email.trim()) return '이메일을 입력해주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
  if (!password) return '비밀번호를 입력해주세요.';
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  return null;
}

// API 에러 → 사용자 메시지 변환
function parseApiError(err) {
  if (err?.status === 401) return '비밀번호가 올바르지 않습니다.';
  if (err?.status === 409) return '이미 사용 중인 이메일입니다.';
  if (err?.status === 404) return '등록되지 않은 이메일입니다.';
  return err?.body?.message ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 조건 + 보안 등급 (21st.dev "Password update Block" 패턴을 Rootin에 맞게 이식)
function passwordChecks(pw) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const LEVELS = [
    { label: '',          color: 'var(--ink-3)' },
    { label: '약함',      color: '#E08A6B' },
    { label: '보통',      color: '#E6B14E' },
    { label: '강함',      color: '#4F7C52' },
    { label: '매우 강함', color: '#2F8F54' },
  ];
  return { checks, score, level: LEVELS[score] };
}

// 입력 필드 — 좌측 아이콘 + 포커스 링 애니메이션 + 실시간 유효 체크
function AuthField({ icon: IconC, type = 'text', placeholder, value, onChange, disabled, name, focusField, setFocusField, onKeyDown, valid, showValid, rightSlot, autoComplete }) {
  const focused = focusField === name;
  const accent = '#2F8F54';
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', color: focused ? accent : 'var(--ink-3)', transition: 'color 0.18s' }}>
        <IconC size={17} />
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        onFocus={() => setFocusField(name)}
        onBlur={() => setFocusField(f => (f === name ? null : f))}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '13px 40px',
          borderRadius: 12, fontSize: 14, outline: 'none',
          background: '#fff', color: 'var(--ink)',
          border: `1px solid ${focused ? accent : (showValid && valid ? '#9CC7AB' : 'var(--rule-2)')}`,
          boxShadow: focused ? '0 0 0 3px rgba(47,143,84,0.12)' : 'none',
          transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
      />
      {rightSlot
        ? <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>
        : (
          <AnimatePresence>
            {showValid && valid && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                style={{ position: 'absolute', right: 12, top: '50%', display: 'inline-flex', width: 18, height: 18, marginTop: -9, borderRadius: '50%', background: accent, color: '#fff', alignItems: 'center', justifyContent: 'center' }}
              >
                <Check size={12} strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        )}
    </div>
  );
}

// 실시간 요건 한 줄
function ReqItem({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: ok ? '#2F8F54' : 'var(--ink-3)', transition: 'color 0.2s' }}>
      <span style={{ display: 'inline-flex', width: 15, height: 15, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: ok ? '#2F8F54' : 'transparent', border: ok ? 'none' : '1.5px solid var(--rule-2)', color: '#fff', transform: ok ? 'scale(1)' : 'scale(0.92)', transition: 'background 0.2s, transform 0.2s' }}>
        {ok && <Check size={10} strokeWidth={3.2} />}
      </span>
      {label}
    </div>
  );
}

// 비밀번호 보안 등급 미터
function StrengthMeter({ pc }) {
  return (
    <div style={{ marginTop: 2 }}>
      <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < pc.score ? pc.level.color : 'var(--rule-2)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
        <span style={{ color: 'var(--ink-3)' }}>보안 등급</span>
        <span style={{ color: pc.level.color, fontWeight: 700 }}>{pc.level.label || '—'}</span>
      </div>
    </div>
  );
}

function AuthScreen({ onAuth, onBackToLanding }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [focusField, setFocusField] = useState(null);
  const googleCallbackRef = useRef(null);
  const googleLoginInFlightRef = useRef(false);

  // Google SDK 로드 + initialize (페이지 로드 시 1회)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          googleCallbackRef.current?.(credential);
        },
      });
    };

    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) {
      initGoogle();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, []);

  async function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID || !window.google || googleLoginInFlightRef.current) return;
    googleLoginInFlightRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const idToken = await new Promise((resolve, reject) => {
        googleCallbackRef.current = resolve;
        window.google.accounts.id.prompt(notification => {
          const isDismissed = notification.isDismissedMoment?.();
          const dismissedReason = isDismissed ? notification.getDismissedReason?.() : null;
          if (
            notification.isNotDisplayed?.() ||
            (isDismissed && dismissedReason !== 'credential_returned')
          ) {
            googleCallbackRef.current = null;
            reject(new Error('Google 로그인 창을 열 수 없습니다.'));
          }
        });
      });
      const { googleLogin, googleLogin: _g } = await import('./api/auth.js');
      await googleLogin({ idToken });
      const { getMe } = await import('./api/user.js');
      const userData = await getMe();
      onAuth(userData);
    } catch (err) {
      setError(err?.message ?? parseApiError(err));
    } finally {
      googleLoginInFlightRef.current = false;
      setLoading(false);
      googleCallbackRef.current = null;
    }
  }

  async function handleSubmit() {
    setError(null);
    const validationError = validate({ mode, email, password, nickname });
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { login } = await import('./api/auth.js');
        await login({ email, password });
        const { getMe } = await import('./api/user.js');
        const userData = await getMe();
        onAuth(userData);
      } else {
        const { signup } = await import('./api/auth.js');
        await signup({ email, password, nickname });
        const { getMe } = await import('./api/user.js');
        const userData = await getMe();
        onAuth(userData);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError(null);
    setEmail('');
    setPassword('');
    setNickname('');
  }

  // 실시간 검증 파생값
  const emailValid = EMAIL_RE.test(email);
  const pc = passwordChecks(password);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: 'var(--paper)' }}>

      {/* ── 왼쪽: 따뜻한 정원 + 마우스를 따라보는 도트 식물 ── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--rule-2)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', padding: 'clamp(36px, 4.5vw, 60px)', background: 'linear-gradient(180deg, #FBF5E8 0%, #F3E9D4 56%, #ECDFC4 100%)' }}>
        {/* 따뜻한 햇살 + 종이결 + 정원 바닥 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(85% 50% at 80% -8%, rgba(255,235,186,0.75), transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none', backgroundImage: 'repeating-radial-gradient(circle at 0 0, #4a341c 0, #4a341c 1px, transparent 1px, transparent 100%)', backgroundSize: '3px 3px' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 68% at 50% 122%, rgba(116,201,140,0.30), transparent 60%)' }} />

        {/* 브랜드 워드마크 — Rootin-logo-source.html 03(Fredoka·글자에 새싹) 적용 */}
        <div style={{ position: 'relative', zIndex: 2, fontFamily: "'Fredoka', var(--font-display)", fontWeight: 600, fontSize: 42, letterSpacing: '-0.015em', lineHeight: 1, color: '#25342A' }}>
          <RootinWordmark leaf1="#2F8F54" leaf2="#74C98C" animate={false} sproutBottom="0.66em" sproutWidth="0.42em" sproutHeight="0.29em" sproutShiftX="0.05em" />
        </div>

        {/* 헤드라인 */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: 'clamp(28px, 6vh, 60px)' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', textTransform: 'uppercase', color: 'var(--moss-2)', opacity: 0.85, fontFamily: 'var(--font-display)' }}>
            {mode === 'login' ? 'Welcome back' : 'Start growing'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(2rem, 3.2vw, 3.1rem)', lineHeight: 1.06, letterSpacing: '-0.045em', margin: '18px 0 0', color: 'var(--ink)' }}>
            오늘 배운 한 줄이<br /><span style={{ color: '#2F8F54' }}>뿌리</span> 깊은 습관이 됩니다
          </h2>
          <p style={{ maxWidth: 340, marginTop: 20, fontSize: 13.5, lineHeight: 1.7, color: 'var(--ink-2)', borderLeft: '1px solid var(--rule-2)', paddingLeft: 16 }}>
            매일의 기록을 심으면 도트 식물이 자라요. 화분 친구들이 기다리고 있어요 — 마우스를 움직여 보세요.
          </p>
        </div>

        {/* 도트 식물 (비밀번호 입력 중엔 시선을 내림) */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 'clamp(10px, 4vh, 36px)' }}>
          <PixelPals shy={focusField === 'password'} />
        </div>

        {/* 푸터 */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 22, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          <span>개인정보</span><span>이용약관</span><span>문의</span>
        </div>
      </div>

      {/* ── 오른쪽: 입력 폼 (재구성 · 21st.dev 패턴 이식) ── */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px clamp(32px, 5vw, 72px)', background: 'var(--paper)' }}>
        <div style={{ width: '100%', maxWidth: 384, margin: '0 auto' }}>
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 26, padding: '7px 14px 7px 11px', borderRadius: 999, background: '#fff', border: '1px solid var(--rule-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', boxShadow: '0 1px 2px rgba(46,42,33,0.05)', cursor: 'pointer' }}
            >
              <ArrowLeft size={15} strokeWidth={2.5} /> 처음으로
            </button>
          )}

          {/* 헤더 */}
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>{mode === 'login' ? 'Welcome back' : 'Start growing'}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', marginTop: 6, letterSpacing: '-0.02em' }}>
            {mode === 'login' ? '다시 만나서 반가워요' : '새로운 정원 시작하기'}
          </h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 6 }}>
            {mode === 'login' ? '오늘의 한 줄을 기록할 시간이에요.' : '이메일만 있으면 바로 첫 화분을 받아요.'}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || !GOOGLE_CLIENT_ID}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', marginTop: 26, padding: '12px 16px', borderRadius: 12,
              background: '#fff', border: '1px solid var(--rule-2)',
              fontSize: 13.5, fontWeight: 500, color: 'var(--ink)',
              opacity: (!GOOGLE_CLIENT_ID || loading) ? 0.5 : 1,
              cursor: (!GOOGLE_CLIENT_ID || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google로 계속하기{!GOOGLE_CLIENT_ID && <span style={{ fontSize: 10.5, color: '#888', marginLeft: 4 }}>(미설정)</span>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0', color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-display)' }}>
            <div style={{ flex: 1, height: 0.5, background: 'var(--rule-2)' }} />
            <span>또는 이메일로</span>
            <div style={{ flex: 1, height: 0.5, background: 'var(--rule-2)' }} />
          </div>

          {/* 입력 필드 — 아이콘 + 포커스 애니메이션 + 실시간 유효 체크 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'signup' && (
              <AuthField
                icon={User} name="nickname" placeholder="정원에서 불릴 이름"
                value={nickname} onChange={e => setNickname(e.target.value)} disabled={loading}
                focusField={focusField} setFocusField={setFocusField}
                valid={!!nickname.trim()} showValid
              />
            )}
            <AuthField
              icon={Mail} type="email" name="email" placeholder="you@example.com" autoComplete="off"
              value={email} onChange={e => setEmail(e.target.value)} disabled={loading}
              focusField={focusField} setFocusField={setFocusField}
              valid={emailValid} showValid={mode === 'signup'}
            />
            <AuthField
              icon={Lock} type={showPw ? 'text' : 'password'} name="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} disabled={loading}
              focusField={focusField} setFocusField={setFocusField}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              rightSlot={(
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  style={{ display: 'inline-flex', color: 'var(--ink-3)', padding: 4 }}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              )}
            />
          </div>

          {/* 회원가입: 실시간 조건 + 비밀번호 보안 등급 */}
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12, padding: '13px 15px', borderRadius: 12, background: '#fff', border: '1px solid var(--rule-2)' }}>
                  <ReqItem ok={emailValid} label="올바른 이메일 형식" />
                  <ReqItem ok={pc.checks.length} label="비밀번호 8자 이상 (필수)" />
                  <div style={{ height: 1, background: 'var(--rule-2)', margin: '2px 0' }} />
                  <StrengthMeter pc={pc} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 에러 메시지 */}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '0.5px solid #fca5a5', fontSize: 12.5, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <Btn
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: 16, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '처리 중…' : mode === 'login' ? '정원으로 들어가기 →' : '첫 화분 받기 →'}
          </Btn>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12.5, color: 'var(--ink-3)' }}>
            {mode === 'login' ? '아직 계정이 없으세요? ' : '이미 계정이 있으세요? '}
            <button onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{ color: 'var(--moss-2)', fontWeight: 500 }}>
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CollectionScreen, AIScreen, ProfileScreen, AuthScreen };
