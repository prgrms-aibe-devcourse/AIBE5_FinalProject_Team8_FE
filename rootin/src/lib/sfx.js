/* =========================================================================
   ROOTIN — 공용 칩튠 효과음 (페이지 버튼용)
   - GameBoySidebar의 톤 엔진(Web Audio 오실레이터)을 동일 음색으로 재사용
   - 음소거 상태는 사이드바와 같은 localStorage 키('rootin_gb_mute')를 공유
     → 사이드바 Start 버튼으로 음소거하면 페이지 버튼 소리도 함께 꺼짐
   ========================================================================= */

let actx = null;
const ctx = () => (actx = actx || new (window.AudioContext || window.webkitAudioContext)());

// 사이드바와 동일한 키를 읽어 음소거 상태를 공유한다.
const isMuted = () => {
  try { return localStorage.getItem('rootin_gb_mute') === '1'; } catch { return false; }
};

// 단음 — GameBoySidebar.jsx의 tone()과 동일한 파라미터 체계
function tone(freq, dur, o = {}) {
  if (isMuted()) return;
  const { type = 'square', vol = 0.06, when = 0, glide = null } = o;
  try {
    const c = ctx();
    if (c.state === 'suspended') c.resume(); // 첫 사용자 제스처에서 재개
    const t = c.currentTime + when;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + dur + 0.03);
  } catch { /* noop */ }
}

// 버튼 성격별 효과음
const SFX = {
  confirm: () => { tone(523, 0.06); tone(784, 0.10, { when: 0.05 }); },       // 저장/발행/수확 등 긍정 확정
  cancel:  () => tone(360, 0.07, { glide: 220, vol: 0.05 }),                  // 닫기/취소
  delete:  () => { tone(220, 0.08, { vol: 0.05 }); tone(150, 0.11, { when: 0.06, vol: 0.05 }); }, // 삭제
  nav:     () => tone(640, 0.05, { vol: 0.05 }),                              // 이동/열기
  toggle:  () => { tone(880, 0.04, { vol: 0.05 }); tone(1175, 0.06, { when: 0.04, vol: 0.05 }); }, // 탭/칩 전환
};

// 이름으로 효과음 재생. 미지정 이름은 nav로 폴백.
export function playSfx(name) {
  (SFX[name] || SFX.nav)();
}
