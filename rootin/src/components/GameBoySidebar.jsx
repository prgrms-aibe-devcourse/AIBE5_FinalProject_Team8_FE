import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from '../context/UserContext.jsx';
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
  const actxRef = useRef(null);
  const toastTimer = useRef(null);
  const powerTimer = useRef(null);

  useEffect(() => { cursorRef.current = cursor; }, [cursor]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { poweredRef.current = powered; }, [powered]);
  useEffect(() => { bootingRef.current = booting; }, [booting]);

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
    if (fxOffRef.current) fxOffRef.current.classList.remove('collapse');
    setPowered(true); LS.set('power', '1');
    if (!boot) { setBooting(false); return; }
    setBooting(true);
    const bootEl = bootRef.current;
    if (bootEl) { bootEl.classList.remove('run', 'flash'); void bootEl.offsetWidth; bootEl.classList.add('run'); }
    powerTimer.current = setTimeout(() => {
      SFX.current.boot();
      if (bootRef.current) bootRef.current.classList.add('flash');
    }, 1040);
    setTimeout(() => {
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
      if (k === 'arrowup')        { e.preventDefault(); nav('up'); }
      else if (k === 'arrowdown') { e.preventDefault(); nav('down'); }
      else if (k === 'enter' || k === 'a') { activate(); press('a'); }
      else if (k === 'b' || k === 'backspace') { if (poweredRef.current && !bootingRef.current) { moveCursor(currentIdx >= 0 ? currentIdx : cursorRef.current, false); SFX.current.back(); } press('b'); }
      else if (k === 's') { cyclePalette(); press('select'); }
      else if (k === 'm') { toggleMute(); press('start'); }
      else if (k === 'p') { togglePower(); }
      else if (k === 'h') { setHidden(!internalHidden); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, activate, moveCursor, cyclePalette, toggleMute, togglePower, setHidden, internalHidden, currentIdx]);

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
                <button className="ab-btn" ref={(el) => (btnRefs.current.b = el)} aria-label="B" onClick={() => { press('b'); if (poweredRef.current && !bootingRef.current) { moveCursor(currentIdx >= 0 ? currentIdx : cursorRef.current, false); SFX.current.back(); } }}>B</button>
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
    </>
  );
}
