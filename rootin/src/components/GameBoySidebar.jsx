import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext.jsx';
import { checkNavGuard, subscribeNavGuard } from '../lib/navGuard.js';
import './gameboy-sidebar.css';

/* =========================================================================
   ROOTIN — Game Boy(DMG) 좌측 사이드바  (claude.ai/design "sidebar" 이식본)
   원본: Rootin Game Boy Sidebar.html + app.js + styles.css
   - 비주얼/애니메이션/칩튠 사운드는 원본과 동일하게 보존
   - 메뉴는 우리 라우팅(onNav)·로그아웃(onLogout)·실제 연속일(useUser)에 연결
   - 데모의 가짜 페이지/카드(loadPage)는 제거(실제 화면이 담당)
   ========================================================================= */

/* ---------- 픽셀아트 아이콘 (8×8 비트 그리드) → SVG data-URI mask ---------- */
const G = {
  home:   ['00011000','00111100','01111110','11111111','01111110','01100110','01100110','01111110'],
  sprout: ['00000000','01000010','01100110','00111100','00011000','00011000','00111100','01111110'],
  book:   ['00000000','01111110','01000010','01011010','01000010','01011010','01000010','01111110'],
  spark:  ['00011000','00011000','00111100','11111111','11111111','00111100','00011000','00011000'],
  person: ['00011000','00111100','00111100','00011000','01111110','11111111','11111111','11111111'],
  power:  ['00011000','00011000','01011010','11011011','11000011','11000011','01100110','00111100'],
  leaf:   ['00000010','00000110','00001110','00011110','00111110','01111100','11111000','01110000'],
  flame:  ['00010000','00011000','00111000','00111100','01111110','01101110','01111110','00111100'],
  star:   ['00011000','00011000','00111100','11111111','01111110','00111100','01100110','11000011'],
};
function pix(grid) {
  const n = grid.length;
  let r = '';
  grid.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '1') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#000">${r}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
const ICO = {};
Object.keys(G).forEach((k) => (ICO[k] = pix(G[k])));

/* ---------- 메뉴 — 우리 라우팅 키에 매핑 ---------- */
const MENU = [
  { key: 'dashboard',  label: '대시보드',  ico: 'home' },
  { key: 'garden',     label: '정원',      ico: 'sprout' },
  { key: 'collection', label: '식물도감',  ico: 'book' },
  { key: 'ai',         label: 'AI 학습',   ico: 'spark' },
  { key: 'profile',    label: '프로필',    ico: 'person' },
  { key: 'logout',     label: '로그아웃',  ico: 'power', logout: true },
];
const NAV_ITEMS = MENU.filter((m) => !m.logout); // 도크 레일은 내비게이션 항목만

const PALETTES = ['dmg', 'moss', 'noir', 'berry', 'dawn'];
const PAL_NAME = { dmg: 'MOSS GREEN', moss: 'FOREST', noir: 'MONO', berry: 'BERRY', dawn: 'DAWN' };

/* ---------- 조작 설명서(레트로 매뉴얼) 항목 — 콘솔 버튼 + 키보드 단축키 ----------
   전원은 재미요소라 안내에 대놓고 두지 않고 맨 끝에서 살짝만 언급한다(fun). */
const MANUAL_ROWS = [
  { keys: ['↑', '↓'], desc: '메뉴 이동 (D-패드·방향키)' },
  { keys: ['A', 'Enter'], desc: '선택' },
  { keys: ['B', '⌫'], desc: '이전 화면으로 뒤로가기' },
  { keys: ['SELECT', 'S'], desc: '화면 색 바꾸기' },
  { keys: ['START', 'M'], desc: '소리 켜기 / 끄기' },
  { keys: ['MENU', 'H'], desc: '사이드바 접기 / 펴기' },
  { keys: ['POWER', 'P'], desc: '전원 — 한번 꺼볼까요? 다시 켜면 부팅 연출이 나와요 😉', fun: true },
];

const LS = {
  get: (k, d) => { try { const v = localStorage.getItem('rootin_gb_' + k); return v === null ? d : v; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('rootin_gb_' + k, v); } catch { /* noop */ } },
};

const ico = (k) => ({ WebkitMaskImage: ICO[k], maskImage: ICO[k] });

export function GameBoySidebar({ current, onNav, onLogout, forceHidden = false }) {
  const { user } = useUser();
  const streak = user?.streak ?? 0;
  const best = user?.bestStreak ?? 0;

  const currentIdx = MENU.findIndex((m) => m.key === current);

  /* ---------- state ---------- */
  const [cursor, setCursor] = useState(() => {
    const saved = parseInt(LS.get('sel', '0'), 10) || 0;
    return Math.min(MENU.length - 1, saved);
  });
  const [palIdx, setPalIdx] = useState(() => Math.max(0, PALETTES.indexOf(LS.get('pal', 'dmg'))));
  const [muted, setMuted] = useState(() => LS.get('mute', '0') === '1');
  const [powered, setPowered] = useState(() => LS.get('power', '1') !== '0');
  const [internalHidden, setInternalHidden] = useState(() => LS.get('hidden', '0') === '1');
  const [booting, setBooting] = useState(false);
  // 첫 렌더에서 바로 뷰포트에 맞는 scale 로 시작한다(lazy init).
  // useState(1) 로 시작하면 마운트 후 useEffect 에서 scale 이 바뀌며 콘솔 폭이 변하고,
  // 그 결과 에디터 인셋 폭이 첫 페인트 직후 달라져 본문이 재중앙정렬되며 떨린다.
  const [scale, setScale] = useState(() =>
    typeof window === 'undefined'
      ? 1
      : Math.max(0.5, Math.min(1, (window.innerHeight - 36) / 786)),
  );
  const [toastText, setToastText] = useState('');
  const [toastOn, setToastOn] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSeen, setManualSeen] = useState(() => LS.get('manualSeen', '0') === '1');
  const [leaveWarn, setLeaveWarn] = useState(null); // 미저장 이탈 경고 메시지(null이면 닫힘)

  /* ---------- refs ---------- */
  const consoleRef = useRef(null);
  const slotRef = useRef(null);
  const ghostRef = useRef(null);
  const bootRef = useRef(null);
  const fxOffRef = useRef(null);
  const lcdRef = useRef(null);
  const dpadRef = useRef(null);
  const miRefs = useRef([]);
  const btnRefs = useRef({});           // A/B/Select/Start press feedback
  const cursorRef = useRef(cursor);
  const mutedRef = useRef(muted);
  const poweredRef = useRef(powered);
  const bootingRef = useRef(booting);
  const manualOpenRef = useRef(false);
  const leaveWarnRef = useRef(false);
  const armedRef = useRef(false);      // 브라우저 뒤로가기를 잡을 히스토리 '트랩'이 깔려있는지
  const bypassRef = useRef(false);     // 우리가 의도적으로 일으킨 popstate는 가드 없이 통과시킨다
  const actxRef = useRef(null);
  const toastTimer = useRef(null);
  const powerTimer = useRef(null);
  const bootEndTimer = useRef(null);    // 부팅 종료(1650ms) 타이머 — 토글/언마운트 시 취소

  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { poweredRef.current = powered; }, [powered]);
  useEffect(() => { bootingRef.current = booting; }, [booting]);
  useEffect(() => { manualOpenRef.current = manualOpen; }, [manualOpen]);
  useEffect(() => { leaveWarnRef.current = !!leaveWarn; }, [leaveWarn]);

  const slotHidden = forceHidden || internalHidden;
  const dockShown = internalHidden && !forceHidden;

  /* ---------- audio (chiptune) — 원본 톤 그대로 ---------- */
  const ac = () => (actxRef.current = actxRef.current || new (window.AudioContext || window.webkitAudioContext)());
  const tone = useCallback((freq, dur, o = {}) => {
    if (mutedRef.current) return;
    const { type = 'square', vol = 0.06, when = 0, glide = null } = o;
    try {
      const c = ac(), t = c.currentTime + when;
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + dur + 0.03);
    } catch { /* noop */ }
  }, []);
  const SFX = useRef(null);
  if (!SFX.current) {
    SFX.current = {
      move:    () => tone(640, 0.05, { vol: 0.05 }),
      select:  () => { tone(523, 0.06); tone(784, 0.10, { when: 0.05 }); },
      back:    () => tone(360, 0.07, { glide: 220, vol: 0.05 }),
      deny:    () => tone(150, 0.09, { vol: 0.05 }),
      palette: () => { tone(880, 0.04, { vol: 0.05 }); tone(1175, 0.06, { when: 0.04, vol: 0.05 }); },
      boot:    () => { [523, 659, 784].forEach((f, i) => tone(f, 0.08, { when: i * 0.09, vol: 0.06 }));
                       tone(1047, 0.28, { when: 0.27, vol: 0.08 }); },
      off:     () => { tone(420, 0.20, { glide: 80, type: 'sawtooth', vol: 0.06 }); tone(110, 0.06, { when: 0.2, vol: 0.05 }); },
    };
  }

  /* ---------- toast ---------- */
  const toast = useCallback((txt) => {
    setToastText(txt);
    setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 1100);
  }, []);

  /* ---------- cursor move (with LCD ghost trail) ---------- */
  const moveCursor = useCallback((i, sound = true) => {
    const len = MENU.length;
    const next = (i + len) % len;
    if (next === cursorRef.current) return;
    const prevBtn = miRefs.current[cursorRef.current];
    const ghost = ghostRef.current;
    if (prevBtn && ghost) {
      ghost.style.transition = 'none';
      ghost.style.top = prevBtn.offsetTop + 'px';
      ghost.style.height = prevBtn.offsetHeight + 'px';
      ghost.style.opacity = '0.5';
      requestAnimationFrame(() => {
        ghost.style.transition = 'opacity .26s ease';
        ghost.style.opacity = '0';
      });
    }
    setCursor(next);
    if (sound) SFX.current.move();
  }, []);

  /* ---------- activate (선택) ---------- */
  const flashLcd = () => {
    const el = lcdRef.current;
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  };
  const activate = useCallback((i) => {
    if (!poweredRef.current || bootingRef.current) return;
    const idx = i == null ? cursorRef.current : i;
    const m = MENU[idx];
    if (!m) return;
    LS.set('sel', String(idx));
    SFX.current.select();
    flashLcd();
    if (m.logout) onLogout?.();
    else onNav?.(m.key);
  }, [onNav, onLogout]);

  /* ---------- press feedback ---------- */
  const press = (key) => {
    const el = btnRefs.current[key];
    if (!el) return;
    el.classList.add('press');
    setTimeout(() => el.classList.remove('press'), 110);
  };
  const pressDpad = (dir) => {
    const dp = dpadRef.current;
    if (!dp) return;
    dp.classList.add('press-' + dir);
    setTimeout(() => dp.classList.remove('press-' + dir), 110);
  };

  /* ---------- nav (D-pad / arrows) ---------- */
  const nav = useCallback((dir) => {
    if (!poweredRef.current || bootingRef.current) return;
    if (dir === 'up') moveCursor(cursorRef.current - 1);
    else if (dir === 'down') moveCursor(cursorRef.current + 1);
    else SFX.current.deny();
  }, [moveCursor]);

  /* ---------- power ---------- */
  const powerOn = useCallback((boot = true) => {
    clearTimeout(powerTimer.current);
    clearTimeout(bootEndTimer.current);
    if (fxOffRef.current) fxOffRef.current.classList.remove('collapse');
    setPowered(true); LS.set('power', '1');
    if (!boot) { setBooting(false); return; }
    setBooting(true);
    const bootEl = bootRef.current;
    if (bootEl) { bootEl.classList.remove('run', 'flash'); void bootEl.offsetWidth; bootEl.classList.add('run'); }
    powerTimer.current = setTimeout(() => {
      // 오디오가 풀린 상태(running)면 부팅 애니메이션 중 부팅음을 낸다(테마 변경 등 클릭 진입).
      // 새로고침처럼 막힌 상태(suspended)면 미루지 않고 생략한다 —
      // 미뤄서 첫 클릭에 내면 그 클릭/페이지 효과음과 겹치기 때문.
      // 아직 컨텍스트가 없으면(제스처 전) 만들지 않는다 — actxRef 를 직접 본다.
      if (actxRef.current?.state === 'running') SFX.current.boot();
      if (bootRef.current) bootRef.current.classList.add('flash');
    }, 1040);
    bootEndTimer.current = setTimeout(() => {
      if (bootRef.current) bootRef.current.classList.remove('run', 'flash');
      setBooting(false);
    }, 1650);
  }, []);
  const powerOff = useCallback(() => {
    if (!poweredRef.current || bootingRef.current) return;
    clearTimeout(powerTimer.current);
    SFX.current.off();
    if (fxOffRef.current) fxOffRef.current.classList.add('collapse');
    LS.set('power', '0');
    powerTimer.current = setTimeout(() => {
      setPowered(false);
      if (fxOffRef.current) fxOffRef.current.classList.remove('collapse');
    }, 430);
  }, []);
  const togglePower = useCallback(() => {
    if (poweredRef.current) powerOff(); else powerOn(true);
  }, [powerOn, powerOff]);

  /* ---------- palette / mute ---------- */
  const cyclePalette = useCallback(() => {
    setPalIdx((p) => {
      const n = (p + 1) % PALETTES.length;
      LS.set('pal', PALETTES[n]);
      toast(PAL_NAME[PALETTES[n]]);
      return n;
    });
    SFX.current.palette();
  }, [toast]);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const n = !m;
      mutedRef.current = n;
      LS.set('mute', n ? '1' : '0');
      if (!n) SFX.current.move();
      toast(n ? 'SOUND OFF' : 'SOUND ON');
      return n;
    });
  }, [toast]);

  /* ---------- hide / show ---------- */
  const setHidden = useCallback((h) => {
    setInternalHidden((was) => {
      if (h !== was) tone(h ? 360 : 540, 0.08, { glide: h ? 240 : 720, vol: 0.05 });
      LS.set('hidden', h ? '1' : '0');
      return h;
    });
  }, [tone]);

  /* ---------- 조작 설명서 열기/닫기 ---------- */
  const openManual = useCallback(() => {
    setManualOpen(true);
    setManualSeen((seen) => { if (!seen) LS.set('manualSeen', '1'); return true; });
    SFX.current.select();
  }, []);
  const closeManual = useCallback(() => {
    setManualOpen(false);
    SFX.current.back();
  }, []);

  /* ---------- 실제 이탈 — 트랩이 깔려 있으면 그 항목까지 함께 건너뛴다 ----------
     미저장 중에는 현재 히스토리 최상단이 우리가 깐 트랩이라, 이전 화면으로 가려면
     트랩(+에디터 항목)을 한꺼번에 건너뛰어야 한다. 트랩이 없으면 평범하게 한 칸 뒤로. */
  const leaveNow = useCallback(() => {
    bypassRef.current = true;
    armedRef.current = false;
    if (window.history.state?.__gbTrap && window.history.length > 2) {
      // [이전 화면, 에디터, 트랩] — 트랩+에디터 항목을 함께 건너뛰어 실제 이전 화면으로.
      window.history.go(-2);
    } else if (window.history.state?.__gbTrap) {
      // [에디터, 트랩] — 새 탭/북마크/새로고침으로 에디터가 첫 항목이라 건너뛸 이전 화면이 없다.
      // 이때 back()은 첫 항목에서 무반응(popstate도 안 옴)이라 bypass 플래그가 영구히 남고
      // B 버튼을 누를 때마다 모달만 반복된다. 그래서 라우터로 기본 화면(대시보드)으로 보내
      // 확실히 에디터를 벗어난다. (이동하면 에디터가 언마운트되며 자기 navGuard를 스스로 해제)
      bypassRef.current = false; // 우리가 일으킨 popstate가 없으므로 직접 해제
      onNav?.('dashboard');
    } else {
      // 트랩이 없는 일반 상황 — 한 칸 뒤로.
      window.history.back();
    }
  }, [onNav]);

  /* ---------- 뒤로가기(B) — 미저장 작업이 있으면 경고 모달 ---------- */
  const goBack = useCallback(() => {
    if (!poweredRef.current || bootingRef.current) return;
    const warn = checkNavGuard();
    if (warn) { SFX.current.deny(); setLeaveWarn(warn); return; }
    SFX.current.back();
    leaveNow();
  }, [leaveNow]);
  const confirmLeave = useCallback(() => {
    setLeaveWarn(null);
    SFX.current.back();
    leaveNow();
  }, [leaveNow]);
  const cancelLeave = useCallback(() => {
    setLeaveWarn(null);
    SFX.current.move();
  }, []);

  /* ---------- 브라우저 뒤로가기도 같은 경고로 잡기 ----------
     BrowserRouter라 useBlocker를 못 써서, 미저장 작업이 생기면 히스토리에 '트랩'
     항목을 하나 올려둔다. 그래야 브라우저 뒤로가기가 화면을 즉시 떠나(언마운트해
     작성 내용을 잃지) 않고 popstate로 잡혀, B 버튼과 동일한 경고 모달을 띄울 수 있다.
     pushState로 같은 URL 항목을 더하므로 주소·라우터 화면은 그대로다(보이지 않음). */
  useEffect(() => {
    const arm = () => {
      if (armedRef.current || checkNavGuard() == null) return;
      armedRef.current = true;
      // 이미 트랩 위에 있으면 다시 쌓지 않는다(중복 누적 방지).
      if (!window.history.state?.__gbTrap) {
        window.history.pushState({ ...window.history.state, __gbTrap: 1 }, '');
      }
    };
    const onPop = () => {
      if (bypassRef.current) { bypassRef.current = false; return; }
      const warn = checkNavGuard();
      if (warn) {
        // 미저장 → 떠나지 못하게 트랩을 다시 올리고 B와 동일한 경고 모달.
        // 이미 트랩 위면 중복 누적을 막는다.
        armedRef.current = true;
        if (!window.history.state?.__gbTrap) {
          window.history.pushState({ ...window.history.state, __gbTrap: 1 }, '');
        }
        SFX.current.deny();
        setLeaveWarn(warn);
      } else if (armedRef.current) {
        // 저장이 끝나 막을 필요는 없지만 트랩이 남아 사용자가 그걸 pop함
        // → 한 번의 뒤로가기로 실제로 이전 화면까지 가도록 이어서 back
        armedRef.current = false;
        window.history.back();
      }
    };
    const unsub = subscribeNavGuard(arm);
    window.addEventListener('popstate', onPop);
    arm(); // 마운트 시점에 이미 미저장이면 즉시 트랩 무장
    return () => { unsub(); window.removeEventListener('popstate', onPop); };
  }, []);

  /* ---------- 라우트(current)가 바뀌면 커서를 따라가게 ---------- */
  useEffect(() => {
    if (currentIdx >= 0) { setCursor(currentIdx); cursorRef.current = currentIdx; }
  }, [currentIdx]);

  /* ---------- boot on mount + audio resume on first gesture ---------- */
  useEffect(() => {
    if (poweredRef.current) powerOn(true);
    const resume = () => { try { ac().resume(); } catch { /* noop */ } window.removeEventListener('pointerdown', resume); };
    window.addEventListener('pointerdown', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      clearTimeout(powerTimer.current);
      clearTimeout(bootEndTimer.current);
      clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- scale-to-fit (viewport 높이에 맞춰 콘솔 zoom) ---------- */
  useEffect(() => {
    const layout = () => {
      const s = Math.max(0.5, Math.min(1, (window.innerHeight - 36) / 786));
      setScale(s);
    };
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, []);

  /* 접힘 애니메이션이 콘텐츠를 정확히 x=0 으로 채우도록, 슬롯 실제 폭을 --slot-w 에 반영.
     :root 에도 반영 → 인셋 쪽 페이지(TIL 상세)가 본문을 화면 중앙으로 보정할 때
     사이드바와 같은 폭/이징으로 CSS 트랜지션해 움찔거림 없이 따라가게 한다. */
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const w = `${Math.round(el.getBoundingClientRect().width)}px`;
    el.style.setProperty('--slot-w', w);
    document.documentElement.style.setProperty('--slot-w', w);
  }, [scale]);

  /* ---------- keyboard (입력창에선 무시 — 에디터 충돌 방지) ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      // 설명서가 열려 있으면 콘솔 단축키는 막고 ESC로만 닫는다.
      if (manualOpenRef.current) { if (k === 'escape') setManualOpen(false); return; }
      // 이탈 경고 모달이 떠 있으면 ESC=머무르기 / Enter=나가기만 받는다.
      if (leaveWarnRef.current) { if (k === 'escape') cancelLeave(); else if (k === 'enter') confirmLeave(); return; }
      if (k === 'arrowup')        { e.preventDefault(); nav('up'); }
      else if (k === 'arrowdown') { e.preventDefault(); nav('down'); }
      else if (k === 'enter' || k === 'a') { activate(); press('a'); }
      else if (k === 'b' || k === 'backspace') { goBack(); press('b'); }
      else if (k === 's') { cyclePalette(); press('select'); }
      else if (k === 'm') { toggleMute(); press('start'); }
      else if (k === 'p') { togglePower(); }
      else if (k === 'h') { setHidden(!internalHidden); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, activate, moveCursor, cyclePalette, toggleMute, togglePower, setHidden, internalHidden, currentIdx, goBack, confirmLeave, cancelLeave]);

  /* ---------- wrapper style: 픽셀 아이콘 CSS 변수 주입 ---------- */
  const iconVars = {
    '--ico-leaf': ICO.leaf,
    '--ico-flame': ICO.flame,
    '--ico-star': ICO.star,
    '--ico-sprout': ICO.sprout,
  };

  const palette = PALETTES[palIdx];
  const cursorIco = MENU[cursor]?.ico ?? 'home';

  return (
    <>
      {/* === 콘솔 (좌측 flex 칼럼) === */}
      <div
        ref={slotRef}
        className={`gbsb gbsb-slot${slotHidden ? ' hidden' : ''}`}
        data-pal={palette}
        style={iconVars}
      >
        <div
          className="console"
          data-power={powered ? 'on' : 'off'}
          data-controls="compact"
          ref={consoleRef}
          style={{ zoom: scale }}
        >
          {/* Power switch */}
          <div className="power-row">
            <div
              className="power-switch"
              role="button"
              tabIndex={0}
              aria-label="전원"
              onClick={togglePower}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePower(); } }}
            >
              <span className="ps-track">
                <span className="ps-tick">◁ OFF</span>
                <span className="ps-tick">ON ▷</span>
              </span>
              <span className="ps-knob" />
            </div>
            <span className="power-label">POWER</span>
            <button
              type="button"
              className={`gb-help${manualSeen ? '' : ' pulse'}`}
              aria-label="조작 설명서 열기"
              title="조작 설명서 (버튼·단축키)"
              onClick={openManual}
            >
              <span className="gb-help-q" aria-hidden="true">?</span>
              <span className="gb-help-cap">조작</span>
            </button>
          </div>

          {/* Screen bezel */}
          <div className="bezel">
            <div className="bezel-top">
              <span className="led" aria-hidden="true" />
              <span className="bezel-caption">DOT&nbsp;MATRIX&nbsp;WITH&nbsp;NATURE&nbsp;SOUND</span>
            </div>

            <div className="screen-frame">
              <div className="stripe" aria-hidden="true">
                <span className="stripe-line red" />
                <span className="stripe-line blue" />
              </div>

              {/* The LCD */}
              <div className="lcd" data-pal={palette} ref={lcdRef}>
                <div className="lcd-ui">
                  <div className="lcd-titlebar">
                    <span className="tb-left"><span className="tb-mark" />ROOTIN</span>
                    <span className="tb-right"><span className="tb-flame" />{streak}</span>
                  </div>
                  <div className="lcd-subtitle">매일의 학습이 자라는 곳</div>
                  <div className="lcd-divider" aria-hidden="true" />

                  {/* Menu */}
                  <nav className="lcd-menu" aria-label="메뉴" onMouseLeave={() => { if (poweredRef.current && !bootingRef.current) setCursor(currentIdx >= 0 ? currentIdx : cursor); }}>
                    {MENU.map((m, i) => {
                      const isCurrent = i === currentIdx;
                      const isCursor = i === cursor && i !== currentIdx;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          ref={(el) => (miRefs.current[i] = el)}
                          className={`mi${m.logout ? ' is-logout' : ''}${isCurrent ? ' is-current' : ''}${isCursor ? ' is-cursor' : ''}`}
                          aria-current={isCurrent ? 'page' : undefined}
                          onClick={() => { if (!poweredRef.current || bootingRef.current) return; setCursor(i); cursorRef.current = i; activate(i); }}
                          onMouseEnter={() => { if (poweredRef.current && !bootingRef.current && i !== cursor) moveCursor(i); }}
                        >
                          <span className="mi-cursor" aria-hidden="true">▶</span>
                          <span className="mi-ico" style={ico(m.ico)} aria-hidden="true" />
                          <span className="mi-label">{m.label}</span>
                        </button>
                      );
                    })}
                  </nav>

                  <div className="lcd-spacer" />

                  {/* Status footer */}
                  <div className="lcd-status">
                    <span className="st-item"><span className="st-ico st-streak" aria-hidden="true" />연속 {streak}</span>
                    <span className="st-item"><span className="st-ico st-best" aria-hidden="true" />최고 {best}</span>
                  </div>
                </div>

                {/* Boot logo */}
                <div className="boot" ref={bootRef} aria-hidden="true">
                  <div className="boot-mark" />
                  <div className="boot-word">ROOTIN</div>
                </div>

                {/* Selection ghost */}
                <div className="ghost" ref={ghostRef} aria-hidden="true" />

                {/* Palette toast */}
                <div className={`pal-toast${toastOn ? ' show' : ''}`} aria-hidden="true">{toastText}</div>

                {/* Screen FX overlays */}
                <div className="fx fx-scan" aria-hidden="true" />
                <div className="fx fx-refresh" aria-hidden="true" />
                <div className="fx fx-vignette" aria-hidden="true" />
                <div className="fx fx-glass" aria-hidden="true" />
                <div className="fx fx-flicker" aria-hidden="true" />
                <div className="fx fx-off" ref={fxOffRef} aria-hidden="true" />

                {/* 전원 OFF 복구 안내 — 스위치를 못 찾아도 화면을 누르면 다시 켜진다 */}
                <button
                  type="button"
                  className="lcd-off-prompt"
                  aria-label="전원 켜기"
                  tabIndex={powered ? -1 : 0}
                  onClick={() => { if (!poweredRef.current && !bootingRef.current) powerOn(true); }}
                >
                  <span className="op-chev" aria-hidden="true">▲</span>
                  <span className="op-title">전원 OFF</span>
                  <span className="op-sub">{'스위치를 켜거나\n화면을 눌러 다시 켜기'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Device brand */}
          <div className="brand">
            <span className="brand-word">Rootin</span>
            <span className="brand-sub">DOT-MATRIX&nbsp;LEARNING&nbsp;SYSTEM<span className="tm">TM</span></span>
          </div>

          {/* Controls */}
          <div className="controls">
            <div className="dpad" ref={dpadRef}>
              <span className="dpad-bar h" />
              <span className="dpad-bar v" />
              <span className="dpad-center" />
              <button className="dpad-btn up"    aria-label="위"    onClick={() => { nav('up'); pressDpad('up'); }} />
              <button className="dpad-btn down"  aria-label="아래"  onClick={() => { nav('down'); pressDpad('down'); }} />
              <button className="dpad-btn left"  aria-label="왼쪽"  onClick={() => nav('left')} />
              <button className="dpad-btn right" aria-label="오른쪽" onClick={() => nav('right')} />
            </div>

            <div className="ctr-mid">
              <div className="startsel">
                <div className="ss-wrap">
                  <button className="ss-btn" ref={(el) => (btnRefs.current.select = el)} aria-label="Select — 화면 색상(팔레트) 바꾸기" onClick={() => { press('select'); cyclePalette(); }} />
                  <span className="ss-label">SELECT</span>
                  <span className="ss-fn">화면 색</span>
                </div>
                <div className="ss-wrap">
                  <button className="ss-btn" ref={(el) => (btnRefs.current.start = el)} aria-label="Start — 소리 켜고 끄기" onClick={() => { press('start'); toggleMute(); }} />
                  <span className="ss-label">START</span>
                  <span className="ss-fn">소리</span>
                </div>
              </div>
              <div className="speaker" aria-hidden="true" />
            </div>

            <div className="ab">
              <div className="ab-btn-wrap b">
                <button className="ab-btn" ref={(el) => (btnRefs.current.b = el)} aria-label="B 뒤로가기" onClick={() => { press('b'); goBack(); }}>B</button>
                <span className="ab-label">B</span>
              </div>
              <div className="ab-btn-wrap a">
                <button className="ab-btn" ref={(el) => (btnRefs.current.a = el)} aria-label="A 선택" onClick={() => { press('a'); activate(); }}>A</button>
                <span className="ab-label">A</span>
              </div>
            </div>
          </div>

          {/* Hide / show toggle — molded into the device's right edge */}
          <button className="side-toggle" aria-label="사이드바 숨기기 / 꺼내기" onClick={() => setHidden(!internalHidden)}>
            <span className="st-grip" />
            <span className="st-chevron" />
            <span className="st-grip" />
            <span className="st-cap">MENU</span>
          </button>
        </div>
      </div>

      {/* === 접힌 상태 도크 (Game Boy Micro rail) === */}
      <div
        className={`gbsb gbsb-dock${dockShown ? ' is-shown' : ''}`}
        data-pal={palette}
        style={{ ...iconVars, '--dock-scale': scale.toFixed(3) }}
        aria-hidden={!dockShown}
      >
        <div className="micro">
          <span className="micro-screen">
            <span className="micro-ico" style={ico(cursorIco)} />
            <span className="micro-streak"><span className="micro-flame" />{streak}</span>
          </span>
          <span className="micro-rail">
            {NAV_ITEMS.map((m) => {
              const idx = MENU.findIndex((x) => x.key === m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  title={m.label}
                  className={idx === cursor ? 'sel' : undefined}
                  onClick={(e) => { e.stopPropagation(); if (!poweredRef.current || bootingRef.current) return; setCursor(idx); cursorRef.current = idx; activate(idx); }}
                >
                  <span className="ri-ico" style={ico(m.ico)} />
                </button>
              );
            })}
          </span>
          <button className="dock-expand" type="button" aria-label="메뉴 펼치기" onClick={(e) => { e.stopPropagation(); setHidden(false); }}>
            <span className="exp-chev" aria-hidden="true" />
            <span className="exp-cap">펼치기</span>
          </button>
        </div>
      </div>

      {/* === 조작 설명서 (레트로 매뉴얼) === */}
      {manualOpen && (
        <div
          className="gbsb gb-manual-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="조작 설명서"
          onClick={closeManual}
        >
          <div className="gb-manual" onClick={(e) => e.stopPropagation()}>
            <div className="gb-manual-bar">
              <span className="gb-manual-led" aria-hidden="true" />
              <span className="gb-manual-cap">INSTRUCTIONS · 조작 설명서</span>
              <button type="button" className="gb-manual-x" aria-label="닫기" onClick={closeManual}>✕</button>
            </div>
            <div className="gb-manual-body">
              <p className="gb-manual-lead">키보드나 콘솔 버튼으로 조작할 수 있어요.</p>
              <ul className="gb-manual-list">
                {MANUAL_ROWS.map((r) => (
                  <li key={r.desc} className={r.fun ? 'is-fun' : undefined}>
                    <span className="gb-keys">
                      {r.keys.map((key) => <kbd key={key}>{key}</kbd>)}
                    </span>
                    <span className="gb-manual-desc">{r.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* === 미저장 이탈 경고 === */}
      {leaveWarn && (
        <div
          className="gbsb gb-guard-overlay"
          data-pal={palette}
          role="alertdialog"
          aria-modal="true"
          aria-label="저장하지 않고 나가기 경고"
          onClick={cancelLeave}
        >
          <div className="gb-guard" onClick={(e) => e.stopPropagation()}>
            <div className="gb-guard-bar">
              <span className="gb-guard-led" aria-hidden="true" />
              <span className="gb-guard-cap">WARNING · 저장 안 됨</span>
            </div>
            <div className="gb-guard-body">
              <div className="gb-guard-icon" aria-hidden="true">!</div>
              <p className="gb-guard-title">저장하지 않고 나갈까요?</p>
              <p className="gb-guard-msg">{leaveWarn}</p>
              <div className="gb-guard-actions">
                <button type="button" className="gb-guard-btn stay" onClick={cancelLeave}>머무르기</button>
                <button type="button" className="gb-guard-btn leave" onClick={confirmLeave}>나가기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
