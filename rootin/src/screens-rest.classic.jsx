import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Check, ArrowLeft } from 'lucide-react';
import { getPlants } from './api/collection.js';
import { generateSummary, generateQuiz, saveResult, fetchResults, deleteResult } from './api/ai.js';
import { getPots } from './api/pot.js';
import { getMyTils } from './api/til.js';
import { Icon, Pill, Btn, Card, SectionHeader, Spinner } from './ui.jsx';
import { PixelPlant } from './pixel-plants.jsx';
import { RootinWordmark } from './landing/RootinWordmark.jsx';
import { PixelPals } from './auth-pixel-pals.jsx';
import { useUser } from './context/UserContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { inferSpecies } from './utils/plant.js';
import { SPECIES_TO_PIXEL, STAGE_KEYS, GROWTH_STAGE_TO_STAGE, TIL_MODAL_PAGE_SIZE, TIL_IDS_MAX_SIZE } from './screens-rest.logic.js';

// Collection (식물도감), AI, Profile, Auth screens

// 화면 테마 보관함 — 원본(classic) / 게임보이(gameboy) / 다크(dark) 전환
// 다크는 원본과 같은 화면을 색만 바꿔 보여주는 야간 모드다.
const THEME_OPTIONS = [
  { id: 'classic', emoji: '🌿', name: '원본', desc: '깔끔한 식물 테마' },
  { id: 'gameboy', emoji: '🎮', name: '게임보이', desc: '레트로 픽셀 콘솔' },
  { id: 'dark', emoji: '🌙', name: '다크', desc: '눈이 편한 야간 정원' },
];

// BE speciesKey → PixelPlant species 키 매핑


const STAGE_BADGE_STYLE = {
  seed:   { background: '#fff4e0', color: '#8b6340', border: '#f0dcb5' },
  sprout: { background: '#ebf5ef', color: '#2e6b48', border: '#d4ebdc' },
  leaf:   { background: '#e3f2e8', color: '#1d5e38', border: '#c4e0cc' },
  bloom:  { background: '#ffeef2', color: '#b8536a', border: '#ffd4dc' },
  full:   { background: '#eef2f8', color: '#1a3a5c', border: '#d8e2ee' },
};

// ============================
// 도감 단일 카드 (5열 그리드용)
// ============================
function DexCard({ entry, speciesKey, rare }) {
  const pixelSpecies = SPECIES_TO_PIXEL[speciesKey] ?? speciesKey;
  const stageKey = STAGE_KEYS[entry.stageIndex] ?? 'seed';
  const badge = STAGE_BADGE_STYLE[stageKey];

  const collectedBorder = rare
    ? '0.5px solid #d8e2ee'
    : '0.5px solid var(--sprout, #9dd0b0)';

  return (
    <div
      style={{
        background: entry.collected ? 'var(--card)' : 'var(--paper-2)',
        border: entry.collected ? collectedBorder : '0.5px solid var(--rule)',
        borderRadius: 'var(--r-lg, 14px)',
        padding: '12px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        cursor: 'pointer', position: 'relative',
        minHeight: 160,
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {/* 도감 번호 */}
      <div style={{
        fontSize: 9, color: 'var(--ink-3)',
        alignSelf: 'flex-start',
        marginTop: 2,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}>
        No.{entry.dexNumber}
      </div>

      {/* 픽셀 아트 */}
      <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PixelPlant species={pixelSpecies} stage={stageKey} size={62} locked={!entry.collected} />
      </div>

      {/* 이름 */}
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: entry.collected ? 'var(--ink)' : 'var(--ink-3)',
        textAlign: 'center', lineHeight: 1.3,
        fontFamily: 'var(--font-display)',
      }}>
        {entry.collected ? entry.monName : '???'}
      </div>

      {/* 단계 뱃지 */}
      {entry.collected ? (
        <div style={{
          fontSize: 9, fontWeight: 600,
          padding: '2px 8px', borderRadius: 999,
          whiteSpace: 'nowrap',
          background: badge.background, color: badge.color,
          border: `0.5px solid ${badge.border}`,
          fontFamily: 'var(--font-display)',
        }}>
          {entry.stageName} 수확
        </div>
      ) : (
        <div style={{ height: 18 }} />
      )}
    </div>
  );
}

// ============================
// 계열 구분선
// ============================
function DexSectionDivider({ section }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px' }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-display)',
      }}>
        {section.speciesLabel}
      </span>
      <Pill tone={section.rare ? 'navy' : 'green'}>
        {section.rare ? '✦ 희귀종' : '일반종'}
      </Pill>
      <div style={{ flex: 1, height: '0.5px', background: 'var(--rule)' }} />
      <span style={{
        fontSize: 10, color: 'var(--ink-3)',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}>{section.numRange}</span>
    </div>
  );
}

function CollectionScreen() {
  const [dex, setDex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getPlants()
      .then(data => setDex(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSections = useMemo(() => {
    if (!dex?.sections) return [];
    return dex.sections
      .map(section => ({
        ...section,
        entries: filter === 'all' ? section.entries
          : filter === 'collected' ? section.entries.filter(e => e.collected)
          : section.entries.filter(e => !e.collected),
      }))
      .filter(section => section.entries.length > 0);
  }, [dex, filter]);

  const stats = dex?.stats;

  return (
    <div style={{ padding: 32, width: '100%', maxWidth: 1600, margin: '0 auto' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--moss-2)' }}>식물 도감</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24, fontWeight: 700,
            color: 'var(--ink)',
            marginTop: 4, letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="24" height="24" viewBox="0 0 80 80" fill="none">
              <path d="M22 50 L18 68 L62 68 L58 50 Z" fill="#c8a882"/>
              <rect x="20" y="44" width="40" height="8" rx="4" fill="#b8946a"/>
              <rect x="38" y="22" width="4" height="28" rx="2" fill="#a8d5b5"/>
              <ellipse cx="28" cy="32" rx="12" ry="8" fill="#a8d5b5" transform="rotate(-20 28 32)"/>
              <ellipse cx="52" cy="26" rx="11" ry="7.5" fill="#3d8b5e" transform="rotate(15 52 26)"/>
              <circle cx="40" cy="14" r="8" fill="#3d8b5e" opacity="0.9"/>
              <circle cx="33" cy="9" r="6" fill="#3d8b5e" opacity="0.65"/>
              <circle cx="47" cy="9" r="6" fill="#4a9066" opacity="0.65"/>
              <circle cx="40" cy="14" r="2.5" fill="#e8f5ec"/>
            </svg>
            키워낸 식물의 수집 도감
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>
            화분에서 수확할 때마다 도감 칸이 채워져요.
          </div>
          {stats && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Pill tone="default">총 {stats.total}칸</Pill>
              <Pill tone="green">일반 {stats.common}칸</Pill>
              <Pill tone="navy">희귀 {stats.rare}칸</Pill>
              <Pill tone="warn">{stats.collected} / {stats.total} 수집</Pill>
            </div>
          )}
        </div>

        {/* 필터 버튼 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { key: 'all',       label: '전체' },
            { key: 'collected', label: '수집 완료' },
            { key: 'locked',    label: '미수집' },
          ].map(({ key, label }) => (
            <Btn
              key={key}
              variant={filter === key ? 'green' : 'secondary'}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
            </Btn>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          도감을 불러오는 중…
        </div>
      )}

      {!loading && filteredSections.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
          해당 조건의 식물이 없어요.
        </div>
      )}

      {/* 계열별 섹션 */}
      {!loading && filteredSections.map(section => (
        <div key={section.speciesKey}>
          <DexSectionDivider section={section} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 8 }}>
            {section.entries.map(entry => (
              <DexCard key={entry.dexNumber} entry={entry} speciesKey={section.speciesKey} rare={section.rare} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// === AI Screen ===


const createGuideAiTils = () => {
  const guideDate = new Date().toISOString();

  return [
    { id: -1, title: 'React 상태 관리 복습', date: guideDate, tags: ['React', '상태관리'] },
    { id: -2, title: 'Spring API 설계 정리', date: guideDate, tags: ['Spring', 'API'] },
    { id: -3, title: '오늘 배운 알고리즘 메모', date: guideDate, tags: ['Algorithm'] },
  ];
};

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
function AiTilSelectModal({ potId, guideMode = false, onConfirm, onClose, onOpenGuide }) {
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
    if (guideMode) {
      const guideTils = createGuideAiTils();
      setLoading(false);
      setError(null);
      setPartialError(false);
      setKeyword('');
      setSelectedTag(null);
      setPage(0);
      setTotalElements(guideTils.length);
      setTils(guideTils);
      setSelectedIds(new Set(guideTils.slice(0, 1).map(til => til.id)));
      return;
    }

    if (!potId) {
      setLoading(false);
      setError(null);
      setPartialError(false);
      setTotalElements(0);
      setTils([]);
      setSelectedIds(new Set());
      return;
    }
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
  }, [potId, guideMode]);

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
      const matchesTag = !selectedTag || t.tags.map(String).includes(selectedTag);
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
      addableCount:    TIL_IDS_MAX_SIZE - outsideSelected - selectedCount,
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
    if (guideMode || selectedIds.size === 0) return;
    onConfirm(Array.from(selectedIds));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-til-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          background: 'var(--card)', borderRadius: 16, padding: 24,
          width: 560, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', gap: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          outline: 'none',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="ai-til-modal-title" style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: 0 }}>
              학습할 TIL 선택
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
              AI가 분석할 TIL을 골라주세요
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* 도움말(?) 버튼 추가 - 모달용 가이드 투어를 트리거합니다 */}
            <button
              onClick={() => onOpenGuide?.()}
              title="이 모달의 이용 가이드 보기"
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                fontSize: 13, fontWeight: 'bold', color: 'var(--ink-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >?</button>
            <button
              aria-label="닫기"
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                fontSize: 14, color: 'var(--ink-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        </div>

        {/* 검색 */}
        <input
          type="text"
          placeholder="제목으로 검색..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, boxSizing: 'border-box',
            border: '0.5px solid var(--rule-2)', fontSize: 13, color: 'var(--ink)',
            outline: 'none', fontFamily: 'var(--font-body)',
          }}
        />

        {/* 태그 필터 */}
        {tagCounts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tagCounts.map(([tag]) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(prev => prev === tag ? null : tag)}
                style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 11.5,
                  background: selectedTag === tag ? 'var(--moss)' : '#f3f7f3',
                  color: selectedTag === tag ? '#fff' : 'var(--ink-2)',
                  border: selectedTag === tag ? '1px solid var(--moss)' : '0.5px solid var(--rule)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >#{tag}</button>
            ))}
          </div>
        )}

        {/* 전체 선택 + 카운트 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--rule)', paddingBottom: 8 }}>
          {((partialError ? tils.length : totalElements) <= TIL_IDS_MAX_SIZE || (!!(keyword.trim() || selectedTag) && filtered.length <= TIL_IDS_MAX_SIZE)) ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: canSelectAll ? 'pointer' : 'default', fontSize: 12.5, color: 'var(--ink-2)' }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                onChange={toggleAll}
                disabled={filtered.length === 0}
              />
              {canSelectAll ? `전체 선택 (${filtered.length}개)` : `추가 가능한 ${addableCount}개만 선택됩니다`}
            </label>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              검색·태그로 {TIL_IDS_MAX_SIZE}개 이하로 좁히면 전체 선택할 수 있어요
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 600, color: selectedIds.size >= TIL_IDS_MAX_SIZE ? '#b8536a' : 'var(--moss-2)' }}>
            {selectedIds.size} / {TIL_IDS_MAX_SIZE}개 선택
            {selectedIds.size >= TIL_IDS_MAX_SIZE && ' (최대)'}
          </span>
        </div>

        {/* 부분 로드 실패 안내 */}
        {partialError && (
          <div style={{ padding: '6px 10px', borderRadius: 7, background: '#fff8e1', border: '0.5px solid #ffe082', fontSize: 11.5, color: '#b8860b' }}>
            일부 TIL을 불러오지 못했어요. 목록이 불완전할 수 있습니다.
          </div>
        )}

        {/* TIL 목록 - 가이드 타겟팅을 위해 guide-ai-modal-list 클래스를 설정합니다 */}
        <div className="guide-ai-modal-list scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              TIL 목록을 불러오는 중...
            </div>
          ) : error ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#b8536a', fontSize: 13 }}>{error}</div>
          ) : pageTils.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              {tils.length === 0 ? '이 화분에 TIL이 없어요.' : '검색 결과가 없어요.'}
            </div>
          ) : (
            pageTils.map(til => (
              <label
                key={til.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: selectedIds.has(til.id) ? 'var(--paper-2)' : '#fcfdfb',
                  border: selectedIds.has(til.id) ? '1px solid var(--moss)' : '0.5px solid var(--rule)',
                  transition: 'background 0.1s, border-color 0.1s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(til.id)}
                  onChange={() => toggleOne(til.id)}
                  disabled={!selectedIds.has(til.id) && selectedIds.size >= TIL_IDS_MAX_SIZE}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {til.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{formatDate(til.date)}</span>
                    {til.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10.5, color: 'var(--moss-2)', background: '#f0f7f0', borderRadius: 4, padding: '1px 6px' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="이전 페이지"
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12,
                border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                color: currentPage === 0 ? 'var(--ink-3)' : 'var(--ink)',
                cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              }}
            >이전</button>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{currentPage + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              aria-label="다음 페이지"
              style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12,
                border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                color: currentPage === totalPages - 1 ? 'var(--ink-3)' : 'var(--ink)',
                cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >다음</button>
          </div>
        )}

        {/* 확인 / 취소 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="md" style={{ flex: 1 }} onClick={onClose}>취소</Btn>
          <Btn
            className="guide-ai-modal-submit"
            variant="green" size="md"
            style={{
              flex: 2,
              opacity: selectedIds.size === 0 || guideMode ? 0.55 : 1,
              cursor: selectedIds.size === 0 || guideMode ? 'not-allowed' : 'pointer'
            }}
            disabled={selectedIds.size === 0 || guideMode}
            onClick={handleConfirm}
          >
            {selectedIds.size === 0 ? 'TIL을 선택해 주세요' : `${selectedIds.size}개 TIL로 생성`}
          </Btn>
        </div>
      </div>
    </div>
  );
}
// growthStage → PixelPlant stage 매핑

function PotCard({ pot, selected, onClick }) {
  const species = inferSpecies(pot.plantName);
  const stage = GROWTH_STAGE_TO_STAGE[pot.growthStage] ?? 'seed';

  // TIL 개수: BE 응답의 tilCount 필드 사용, 없으면 미표시
  const tilCount = pot.tilCount ?? 0;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, textAlign: 'left', width: '100%',
        background: selected ? 'var(--paper-2)' : '#fff',
        border: selected ? '1.5px solid var(--moss)' : '0.5px solid var(--rule)',
        position: 'relative',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* 식물 이미지 */}
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: selected ? 'var(--paper)' : '#f7f9f7',
        border: '0.5px solid var(--rule)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PixelPlant species={species} stage={stage} size={36} />
      </div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pot.title}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Lv.{pot.level} · TIL {tilCount}개</span>
      </div>

      {/* 선택 체크 배지 */}
      {selected && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--moss)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          {Icon.check}
        </div>
      )}
    </button>
  );
}

function AIScreen({ onOpenGuide }) {
  const { user } = useUser();
  const [mode, setMode] = useState('quiz'); // quiz | summary — 입력 UI 탭 선택
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
  const [guideTilModalActive, setGuideTilModalActive] = useState(false);

  // 📝 가이드 투어 도중 설명용 AI 예시 결과지 데이터를 렌더링하기 위한 가짜 상태(Mock State)입니다.
  const [guideMockActive, setGuideMockActive] = useState(false);

  // 📝 가이드 투어 순차 진행 시 특정 단계에 맞춰 자동으로 TIL 선택 모달(modalOpen)을 열고 닫는 로직을 구현합니다.
  useEffect(() => {
    const handleGuideStep = (e) => {
      const { action, isEnd, selector } = e.detail;
      if (isEnd) {
        setModalOpen(false);
        setGuideTilModalActive(false);
        setGuideMockActive(false);
        return;
      }
      
      // AI 학습 가이드가 실행 중일 때 각 단계별로 화면의 모드나 팝업을 자동 제어합니다.
      if (selector && selector.startsWith('.guide-ai-')) {
        if (action === 'ensureQuizMode') {
          setMode('quiz');
        }

        // TIL 선택 모달을 설명하는 단계에서는 모달을 자동으로 오픈합니다.
        if (action === 'openAiTilModal') {
          setGuideTilModalActive(true);
          setModalOpen(true);
        } else {
          setGuideTilModalActive(false);
          setModalOpen(false);
        }

        // 결과 화면을 설명하는 단계에서는 실제 생성 결과가 없어도 가이드용 예시 데이터를 노출합니다.
        setGuideMockActive(action === 'showAiGuideResult');
      }
    };

    window.addEventListener('rootin-guide-step', handleGuideStep);
    return () => window.removeEventListener('rootin-guide-step', handleGuideStep);
  }, []);
  // 마지막으로 선택한 tilIds (다시 생성 시 재사용)
  const [lastTilIds, setLastTilIds] = useState([]);

  const selectedPot = pots.find(p => p.id === potId) ?? null;

  useEffect(() => () => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
  }, []);

  // 페이지 진입 시 화분 목록 + 사용자 포인트 로딩
  useEffect(() => {
    // 화분 목록 로딩 — 첫 번째 화분 자동 선택
    getPots()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setPots(list);
        if (list.length > 0) {
          setPotId(list[0].id);
        }
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
          return {
            id: r.resultId,
            type: r.type.toLowerCase(),   // 'QUIZ' → 'quiz'
            potId: r.potId,
            content,
            tilIds: r.tilIds ?? [],
            date: formatDate(r.createdAt),
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
    } catch (err) {
      if (err.status === 402) {
        setError('포인트가 부족해요. 활동으로 포인트를 적립해 보세요.');
      } else {
        setError('생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setGenerating(false);
    }
  };

  // 모달 확인 — tilIds 받아서 생성 실행
  const handleModalConfirm = (tilIds) => {
    setModalOpen(false);
    setLastTilIds(tilIds);
    handleGenerate(tilIds);
  };

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setGuideTilModalActive(false);
  }, []);

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

  const guideMockQuizzes = guideMockActive ? [
    { id: 1, question: 'React에서 useEffect의 의존성 배열을 빈 배열([])로 설정하면 어떤 시점에 실행되나요?', options: ['컴포넌트가 처음 화면에 나타날 때(마운트)', '상태가 바뀔 때마다', '화면에서 사라질 때만', '렌더링되기 직전'], answer: 1, explanation: '의존성 배열이 빈 배열인 경우 컴포넌트가 마운트될 때 최초 1회만 동작합니다.' },
    { id: 2, question: '마크다운 문법에서 가장 큰 제목을 표현할 때 쓰는 기호는 무엇인가요?', options: ['#', '##', '###', '####'], answer: 1, explanation: '# 기호를 사용하면 HTML의 h1 태그와 같은 가장 큰 제목이 생성됩니다.' },
  ] : [];
  const guideMockSummary = guideMockActive
    ? '오늘 학습한 React 핵심 개념과 마크다운 작성 팁에 관한 요약입니다. 컴포넌트 생명주기와 훅의 올바른 사용법이 분석되었습니다.'
    : '';
  const guideMockKeyPoints = guideMockActive ? [
    'useEffect의 의존성 관리 및 메모리 누수 방지 기법 학습',
    'Shadcn UI와 Tailwind CSS를 활용한 반응형 웹 인터페이스 배치',
    'AI 학습지 생성 시의 포인트 소모 규칙 확인',
  ] : [];

  return (
    <>
    <div style={{ padding: 32, width: '100%', display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, maxWidth: 1600, margin: '0 auto', fontFamily: 'var(--font-body)' }}>

      {/* Left — source picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <SectionHeader eyebrow="입력" title="학습 소스 선택" />
        <Card padding={18} style={{ marginBottom: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>목적</div>
          {/* 가이드 하이라이트 매칭을 위해 guide-ai-mode 클래스를 추가합니다 */}
          <div className="guide-ai-mode" style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('quiz')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 10,
              background: mode === 'quiz' ? 'var(--coral)' : '#fff',
              color: mode === 'quiz' ? '#fff' : 'var(--ink-2)',
              border: '0.5px solid ' + (mode === 'quiz' ? 'var(--coral)' : 'var(--rule-2)'),
              fontSize: 12.5, fontWeight: 500, textAlign: 'left',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>📝 복습 문제 생성</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, lineHeight: 1.5 }}>TIL에서 {quizCount}문제 자동 생성</div>
            </button>
            <button onClick={() => setMode('summary')} style={{
              flex: 1, padding: '12px 10px', borderRadius: 10,
              background: mode === 'summary' ? 'var(--coral)' : '#fff',
              color: mode === 'summary' ? '#fff' : 'var(--ink-2)',
              border: '0.5px solid ' + (mode === 'summary' ? 'var(--coral)' : 'var(--rule-2)'),
              fontSize: 12.5, fontWeight: 500, textAlign: 'left',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>✨ TIL 요약</div>
              <div style={{ fontSize: 10.5, opacity: 0.7, lineHeight: 1.5 }}>핵심 개념을 한 문서로</div>
            </button>
          </div>
          {mode === 'quiz' && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '0.5px solid var(--rule)',
            }}>
              <div className="guide-ai-quiz-count" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>문제 수량</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => setQuizCount(c => Math.max(1, c - 1))}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                      fontSize: 15, color: 'var(--ink-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >−</button>
                  <span style={{
                    width: 28, textAlign: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--ink)',
                  }}>{quizCount}</span>
                  <button
                    onClick={() => setQuizCount(c => Math.min(10, c + 1))}
                    style={{
                      width: 28, height: 28, borderRadius: 7,
                      border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                      fontSize: 15, color: 'var(--ink-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >+</button>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>최대 10문제</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card padding={18}>
          <div style={{ marginBottom: 12 }}>
            <div className="eyebrow">화분 선택</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>
              학습할 화분을 하나 선택하세요
            </div>
          </div>

          <div className="guide-ai-pots scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflow: 'auto', paddingRight: 4 }}>
            {potsLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
                화분 목록을 불러오는 중...
              </div>
            ) : pots.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 12.5 }}>
                화분이 없어요. 화분을 먼저 만들어 보세요.
              </div>
            ) : (
              pots.map(p => (
                <PotCard
                  key={p.id}
                  pot={p}
                  selected={potId === p.id}
                  onClick={() => handlePotChange(p.id)}
                />
              ))
            )}
          </div>

          <Btn
            className="guide-ai-select-til"
            variant="green" size="lg"
            style={{ width: '100%', marginTop: 14, opacity: potId ? 1 : 0.45, cursor: potId ? 'pointer' : 'not-allowed' }}
            onClick={() => potId && !generating && setModalOpen(true)}
          >
            {generating
              ? '생성 중...'
              : `${mode === 'quiz' ? `🌱 복습 문제 ${quizCount}개 만들기` : '✨ 요약 생성하기'} · ${mode === 'quiz' ? quizCount * 10 : 50} 포인트 사용`
            }
          </Btn>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)', textAlign: 'center' }}>
            현재 보유: <b style={{ color: 'var(--ink)' }}>{remainPoint}P</b> · 포인트는 활동으로 적립돼요
          </div>
          {error && (
            <div style={{
              marginTop: 8, padding: '10px 14px', borderRadius: 8,
              background: 'var(--danger-weak)', border: '0.5px solid #f7c1c1',
              fontSize: 12, color: '#b8536a', textAlign: 'center',
            }}>
              {error}
            </div>
          )}
        </Card>
      </div>

        {/* ➕ 추가: 저장된 AI 결과 목록(보관함) UI 신규 배치 */}
        <div className="guide-ai-saved-results">
          <SectionHeader eyebrow="보관함" title="저장된 AI 결과" />
          <Card padding={14} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedResults.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                  저장된 결과지가 없습니다.
                </div>
            ) : (
                savedResults.map(item => {
                  const itemPot = pots.find(p => p.id === item.potId);
                  const itemTitle = item.title ?? (item.type === 'quiz'
                    ? `${itemPot?.title ?? item.potId} 화분 복습 문제`
                    : `${itemPot?.title ?? item.potId} 화분 요약본`);
                  return (
                    <div
                        key={item.id}
                        onClick={() => handleSelectSavedItem(item)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', borderRadius: 8, background: '#fcfdfb',
                          border: '0.5px solid var(--rule)', cursor: 'pointer'
                        }}
                    >
                  <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {item.type === 'quiz' ? '📝 ' : '✨ '} {itemTitle}
                  </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{item.date}</span>
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          aria-label="삭제"
                          style={{
                            width: 20, height: 20, borderRadius: 5,
                            border: '0.5px solid var(--rule-2)', background: 'var(--card)',
                            fontSize: 11, color: 'var(--ink-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >✕</button>
                      </div>
                    </div>
                  );
                })
            )}
          </Card>
        </div>

      </div>

      {/* Right — output */}
      <div>
        <SectionHeader
          eyebrow="AI 결과지"
          title={resultMode === 'quiz' ? `복습 문제 (${quizCount}문항)` : 'TIL 요약 결과지'}
          action={generated ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {lastTilIds.length > 0 && (
                <Btn variant="secondary" size="sm" onClick={() => handleGenerate(lastTilIds)}>다시 생성</Btn>
              )}
              <Btn variant="primary" size="sm" onClick={handleSave}>
                {saved ? '✓ 저장됨' : '결과 저장'}
              </Btn>
            </div>
          ) : null}
        />

        <Card className="guide-ai-result" padding={28}>
          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0', color: 'var(--ink-3)' }}>
              <Spinner size={48} color="var(--moss)" ariaHidden={true} />
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', fontFamily: 'var(--font-display)' }}>AI가 TIL을 분석하고 있어요...</div>
            </div>
          ) : (!generated && !guideMockActive) ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0' }}>
              <div style={{ fontSize: 40, opacity: 0.35 }}>{mode === 'quiz' ? '📝' : '✨'}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>
                화분을 선택하고 생성 버튼을 눌러주세요
              </div>
            </div>
          ) : (resultMode === 'quiz' || (guideMockActive && mode === 'quiz')) ? (
            <QuizResult
              pot={selectedPot ?? { name: '예시 화분(JavaScript 입문)' }}
              quizCount={2}
              quizzes={guideMockActive ? guideMockQuizzes : (aiResult?.quizzes ?? [])}
            />
          ) : (
            <SummaryResult
              pot={selectedPot ?? { name: '예시 화분(JavaScript 입문)' }}
              summary={guideMockActive ? guideMockSummary : (aiResult?.summary ?? '')}
              keyPoints={guideMockActive ? guideMockKeyPoints : (aiResult?.keyPoints ?? [])}
            />
          )}
        </Card>
      </div>
    </div>

    {modalOpen && (
      <AiTilSelectModal
        potId={potId}
        guideMode={guideTilModalActive}
        onConfirm={handleModalConfirm}
        onClose={handleModalClose}
        onOpenGuide={onOpenGuide}
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

  function getChoiceStyle(q, i, choice) {
    const base = {
      width: '100%', textAlign: 'left',
      padding: '10px 14px', borderRadius: 9,
      fontSize: 13, cursor: graded ? 'default' : 'pointer',
      transition: 'background 0.15s',
    };
    if (!graded) {
      const isSelected = selected[i] === choice;
      return {
        ...base,
        background: isSelected ? 'var(--moss)' : 'var(--paper-2)',
        color: isSelected ? '#fff' : 'var(--ink)',
        border: isSelected ? '0.5px solid var(--moss)' : '0.5px solid var(--rule)',
        fontWeight: isSelected ? 600 : 400,
      };
    }
    // 채점 후
    const isCorrect = choice === q.answer;
    const isSelected = selected[i] === choice;
    if (isCorrect) return { ...base, background: '#e8f5e9', color: '#2e7d32', border: '0.5px solid #81c784', fontWeight: 600 };
    if (isSelected) return { ...base, background: '#ffebee', color: '#c62828', border: '0.5px solid #e57373' };
    return { ...base, background: 'var(--paper-2)', color: 'var(--ink-3)', border: '0.5px solid var(--rule)' };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{
        padding: 16, background: 'var(--paper-2)', borderRadius: 10,
        fontSize: 12.5, color: 'var(--ink-2)', borderLeft: '2px solid var(--moss)',
      }}>
        💡 {pot?.emoji} {pot?.name} 화분의 TIL에서 핵심 개념 {quizCount}문항을 추출했어요. 보기를 선택하고 채점해보세요.
      </div>

      {list.map((q, i) => (
        <div key={i}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--moss-2)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.6, flex: 1 }}>{q.question}</span>
          </div>
          {q.hint && (
            <div style={{ paddingLeft: 28, marginTop: 6, fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              힌트: {q.hint}
            </div>
          )}
          <div style={{ paddingLeft: 28, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(q.choices ?? []).map((choice, ci) => (
              <button
                key={ci}
                onClick={() => handleSelect(i, choice)}
                style={getChoiceStyle(q, i, choice)}
              >
                <span style={{ marginRight: 8, opacity: 0.5 }}>{['①', '②', '③', '④'][ci]}</span>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
          {graded && (
            <div style={{
              padding: '14px 24px', borderRadius: 12, textAlign: 'center',
              background: correctCount === list.length ? '#e8f5e9' : '#fff8e1',
              border: `1px solid ${correctCount === list.length ? '#81c784' : '#ffd54f'}`,
              fontSize: 14, fontWeight: 600,
              color: correctCount === list.length ? '#2e7d32' : '#f57f17',
            }}>
              {correctCount === list.length
                ? `🎉 전체 정답! ${list.length}문제 모두 맞혔어요.`
                : `${list.length}문제 중 ${correctCount}개 정답이에요.`}
            </div>
          )}
          <button
            onClick={handleGrade}
            disabled={!allAnswered || graded}
            style={{
              padding: '12px 32px', borderRadius: 10,
              background: allAnswered && !graded ? 'var(--moss)' : 'var(--rule)',
              color: allAnswered && !graded ? '#fff' : 'var(--ink-3)',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: allAnswered && !graded ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        padding: 16, background: 'var(--paper-2)', borderRadius: 10,
        fontSize: 12.5, color: 'var(--ink-2)', borderLeft: '2px solid var(--moss)',
      }}>
        🌿 {pot ? `${pot.emoji} ${pot.name} 화분의 TIL 핵심을 한 문서로 묶었어요.` : 'TIL 핵심을 한 문서로 묶었어요.'}
      </div>

      {summary && (
        <div>
          <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
            {summary}
          </div>
        </div>
      )}

      {keyPoints && keyPoints.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, background: 'var(--paper-2)' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>핵심 포인트</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {keyPoints.map((point, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink)' }}>
                <span style={{ width: 4, height: 4, borderRadius: 2, background: 'var(--moss)', marginTop: 6, flexShrink: 0 }} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// === Profile Screen ===

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
    <div style={{ padding: 32, width: '100%', maxWidth: 1600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22, fontFamily: 'var(--font-body)' }}>

      <Card padding={28}>
        {/* 뷰 모드: 가로 배치 / 편집 모드: 아바타+폼 세로 구조 */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 아바타 행 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={profileImageUrl || ''}
                  alt="프로필"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', display: profileImageUrl ? 'block' : 'none' }}
                  onError={e => { e.currentTarget.style.display = 'none'; document.getElementById('avatar-initial-edit').style.display = 'flex'; }}
                />
                <div id="avatar-initial-edit" style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a8d5b5, #3d8b5e)',
                  color: '#fff', display: profileImageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 600,
                }}>{avatarInitial}</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                  data-testid="profile-image-input"
                />
                <button
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--card)', border: '1px solid var(--rule-2)',
                    fontSize: 12, cursor: imageUploading ? 'not-allowed' : 'pointer',
                    opacity: imageUploading ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  disabled={imageUploading}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="프로필 이미지 변경"
                >
                  {imageUploading ? '…' : '📷'}
                </button>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>이미지를 클릭해 변경하세요</span>
            </div>

            {/* 닉네임 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>닉네임</label>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)',
                  border: '0.5px solid var(--rule-2)', borderRadius: 8, padding: '8px 12px',
                  width: '100%', maxWidth: 400, boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 소개 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>소개</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{
                  width: '100%', maxWidth: 600, minHeight: 64, padding: '8px 12px',
                  border: '0.5px solid var(--rule-2)', borderRadius: 8,
                  fontSize: 13, color: 'var(--ink-2)', outline: 'none', resize: 'vertical',
                  fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 버튼 행 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Btn variant="green" onClick={handleSave} disabled={saving}>
                {saving ? '저장 중…' : '저장'}
              </Btn>
              <Btn variant="secondary" onClick={() => { setEditing(false); setSaveError(null); setNickname(user?.name ?? ''); setBio(user?.bio ?? ''); }} disabled={saving}>
                취소
              </Btn>
              {saveError && <span style={{ fontSize: 12, color: '#e05252', marginLeft: 4 }}>{saveError}</span>}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={profileImageUrl || ''}
                alt="프로필"
                style={{ width: 92, height: 92, borderRadius: '50%', objectFit: 'cover', display: profileImageUrl ? 'block' : 'none' }}
                onError={e => { e.currentTarget.style.display = 'none'; document.getElementById('avatar-initial-view').style.display = 'flex'; }}
              />
              <div id="avatar-initial-view" style={{
                width: 92, height: 92, borderRadius: '50%',
                background: 'linear-gradient(135deg, #a8d5b5, #3d8b5e)',
                color: '#fff', display: profileImageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 600,
              }}>{avatarInitial}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{nickname}</h2>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)', fontSize: 13 }}>@{user?.handle ?? ''}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 6 }}>{bio}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
                {user?.joinedAt ?? ''}부터 Rootin과 함께
              </div>
            </div>
            <Btn variant="secondary" onClick={() => setEditing(true)}>
              프로필 수정
            </Btn>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, marginTop: 24, paddingTop: 22, borderTop: '0.5px solid var(--rule)' }}>
          {[
            { label: '누적 TIL', value: (user?.totalTil ?? 0) + '개' },
            { label: '연속 기록', value: (user?.streak ?? 0) + '일' },
            { label: '수확한 식물', value: harvestedCount !== null ? harvestedCount + '종' : '—' },
            { label: '보유 포인트', value: (user?.points ?? 0) + 'P' },
          ].map((s, i) => (
            <div key={i} style={{
              borderRight: i < 3 ? '0.5px solid var(--rule)' : 'none',
              paddingLeft: i > 0 ? 22 : 0,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Account settings */}
      <Card padding={24}>
        <SectionHeader eyebrow="계정 관리" title="설정" />
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* 이메일 행 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '14px 0',
            borderBottom: isLocal ? '0.5px solid var(--rule)' : 'none',
          }}>
            <div style={{ width: 140, fontSize: 12.5, color: 'var(--ink-3)' }}>이메일</div>
            <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{user?.email ?? ''}</div>
          </div>

          {/* 비밀번호 행 — local 유저만 */}
          {isLocal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 0' }}>
              <div style={{ width: 140, fontSize: 12.5, color: 'var(--ink-3)' }}>비밀번호</div>
              <div style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>••••••••</div>
              <Btn variant="secondary" size="sm" onClick={() => setShowPasswordForm(true)}>변경</Btn>
            </div>
          )}
        </div>
      </Card>

      {/* 테마 보관함 — 원본/게임보이 전환 */}
      <Card padding={24}>
        <SectionHeader eyebrow="화면 테마" title="테마 보관함" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                aria-pressed={active}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5,
                  padding: 16,
                  borderRadius: 14,
                  border: active ? '1.5px solid var(--moss)' : '1px solid var(--rule)',
                  background: active ? 'color-mix(in oklch, var(--moss) 8%, var(--paper))' : 'var(--paper)',
                  boxShadow: active ? '0 2px 12px color-mix(in oklch, var(--moss) 22%, transparent)' : 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{opt.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{opt.name}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{opt.desc}</span>
                <span style={{ marginTop: 3, fontSize: 11.5, fontWeight: 600, color: active ? 'var(--moss)' : 'var(--ink-3)' }}>
                  {active ? '● 장착됨' : '○ 선택'}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px' }}>
        <button
          onClick={handleWithdraw}
          disabled={withdrawing}
          style={{
            fontSize: 12.5,
            color: '#b8536a',
            background: 'transparent',
            border: '1px solid #b8536a',
            borderRadius: 6,
            padding: '4px 12px',
            cursor: withdrawing ? 'not-allowed' : 'pointer',
            opacity: withdrawing ? 0.6 : 1,
          }}
        >
          {withdrawing ? '처리 중…' : '회원 탈퇴'}
        </button>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordForm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 42, 71, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            backdropFilter: 'blur(4px)',
          }}
          onClick={handlePasswordFormCancel}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 420, background: 'var(--card)', borderRadius: 18,
              padding: '32px 28px', boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--moss-2)', marginBottom: 4 }}>계정 관리</div>
            <h3 style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700,
              color: 'var(--ink)', marginBottom: 22,
            }}>
              비밀번호 변경
            </h3>

            {pwStep === 'form' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: '현재 비밀번호', value: pwCurrent, setter: setPwCurrent },
                    { label: '새 비밀번호', value: pwNew, setter: setPwNew },
                    { label: '새 비밀번호 확인', value: pwConfirm, setter: setPwConfirm },
                  ].map(({ label, value, setter }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{
                        fontSize: 11.5, color: 'var(--ink-3)',
                        fontFamily: 'var(--font-display)', letterSpacing: '0.06em', textTransform: 'uppercase',
                      }}>
                        {label}
                      </label>
                      <input
                        type="password"
                        value={value}
                        onChange={e => setter(e.target.value)}
                        style={{
                          padding: '9px 12px', border: '0.5px solid var(--rule-2)', borderRadius: 8,
                          fontSize: 13.5, color: 'var(--ink)', fontFamily: 'var(--font-body)',
                          outline: 'none', width: '100%', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>

                {pwError && (
                  <div style={{
                    marginTop: 12, padding: '9px 13px', borderRadius: 8,
                    background: 'var(--danger-weak)', border: '0.5px solid #f7c1c1',
                    fontSize: 12.5, color: '#b8536a',
                  }}>
                    {pwError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <Btn variant="secondary" size="lg" style={{ flex: 1 }} onClick={handlePasswordFormCancel}>
                    취소
                  </Btn>
                  <Btn variant="green" size="lg" style={{ flex: 1 }} onClick={handlePasswordNext}>
                    비밀번호 변경
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  padding: '18px 16px', borderRadius: 10, background: 'var(--paper-2)',
                  fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 22,
                }}>
                  정말 비밀번호를 변경하시겠습니까?<br />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>변경 후에는 새 비밀번호로 다시 로그인해야 합니다.</span>
                </div>

                {pwError && (
                  <div style={{
                    marginBottom: 14, padding: '9px 13px', borderRadius: 8,
                    background: 'var(--danger-weak)', border: '0.5px solid #f7c1c1',
                    fontSize: 12.5, color: '#b8536a',
                  }}>
                    {pwError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <Btn variant="secondary" size="lg" style={{ flex: 1 }} onClick={() => { setPwStep('form'); setPwError(null); }} disabled={pwSaving}>
                    아니요
                  </Btn>
                  <Btn variant="green" size="lg" style={{ flex: 1 }} onClick={handlePasswordConfirm} disabled={pwSaving}>
                    {pwSaving ? '변경 중…' : '변경합니다'}
                  </Btn>
                </div>
              </>
            )}
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
  if (err?.status === 401) return '이메일 또는 비밀번호가 올바르지 않습니다.';
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
          background: 'var(--card)', color: 'var(--ink)',
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

  // Google SDK 스크립트 로드 (페이지 로드 시 1회)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const scriptId = 'google-gsi-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  async function handleGoogleLogin() {
    if (!GOOGLE_CLIENT_ID || !window.google || googleLoginInFlightRef.current) return;
    googleLoginInFlightRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const idToken = await new Promise((resolve, reject) => {
        // initialize()를 매 호출마다 재실행하여 취소 후 재시도 시 suppression 상태 리셋
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => {
            googleCallbackRef.current?.(credential);
          },
        });
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 26, padding: '7px 14px 7px 11px', borderRadius: 999, background: 'var(--card)', border: '1px solid var(--rule-2)', color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-display)', boxShadow: '0 1px 2px rgba(46,42,33,0.05)', cursor: 'pointer' }}
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
              background: 'var(--card)', border: '1px solid var(--rule-2)',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12, padding: '13px 15px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--rule-2)' }}>
                  <ReqItem ok={emailValid} label="올바른 이메일 형식" />
                  <ReqItem ok={pc.checks.length} label="비밀번호 8자 이상 (필수)" />
                  <div style={{ height: 1, background: 'var(--rule-2)', margin: '2px 0' }} />
                  <StrengthMeter pc={pc} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    {[{ ok: pc.checks.upper, l: '대문자' }, { ok: pc.checks.number, l: '숫자' }, { ok: pc.checks.special, l: '특수문자' }].map(p => (
                      <span key={p.l} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: p.ok ? '#EAF3EC' : 'var(--paper-2)', color: p.ok ? '#2F8F54' : 'var(--ink-3)', border: `1px solid ${p.ok ? '#BFE0C9' : 'var(--rule-2)'}`, transition: 'background 0.2s, color 0.2s, border-color 0.2s' }}>
                        {p.ok ? '✓ ' : ''}{p.l}
                      </span>
                    ))}
                  </div>
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
