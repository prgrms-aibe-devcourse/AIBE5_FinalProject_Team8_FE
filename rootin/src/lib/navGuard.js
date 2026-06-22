// 전역 이탈 가드(navigation guard)
// 화면이 "미저장 작업이 있음"을 알리는 함수를 등록하면, 게임보이 사이드바의
// 뒤로가기(B)가 실제 이동 전에 이를 확인하고 경고 모달을 띄운다.
//
// 등록 함수는 호출 시점의 상태를 보고 "막아야 하면 경고 메시지(string)를,
// 막을 필요 없으면 null"을 반환한다. BrowserRouter라 useBlocker를 쓸 수 없어
// 모듈 단위 레지스트리로 화면↔사이드바를 느슨하게 연결한다.

let current = null;
const listeners = new Set();

function emit() {
  for (const cb of listeners) {
    try { cb(); } catch { /* noop */ }
  }
}

export function setNavGuard(fn) {
  current = fn;
  emit();
}

export function clearNavGuard(fn) {
  // 등록했던 함수와 동일할 때만 해제(다른 화면이 이미 덮어쓴 경우를 보호).
  // 인자 없는 호출로 남의 가드까지 지우지 않도록 fn이 일치할 때만 해제한다.
  if (current === fn) { current = null; emit(); }
}

// 가드가 바뀔 때(등록/해제·재등록) 알림을 받는다. 사이드바가 이를 구독해
// "미저장 작업이 생기면" 브라우저 뒤로가기를 잡을 히스토리 트랩을 미리 깔아둔다.
export function subscribeNavGuard(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function checkNavGuard() {
  try {
    return typeof current === 'function' ? current() : null;
  } catch {
    return null;
  }
}
