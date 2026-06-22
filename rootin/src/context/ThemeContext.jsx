import { createContext, useContext, useEffect, useState } from 'react';

// 사이트 디자인 테마 — 'gameboy'(현재 라이브) / 'classic'(원본 디자인) / 'dark'(클래식 다크 변형)
// 'dark'는 클래식과 동일한 컴포넌트를 그대로 쓰고 색 토큰만 다크로 덮는 팔레트 변형이다.
// 버튼/보관함으로 전환하며 localStorage에 보존한다.
const ThemeContext = createContext(null);
const STORAGE_KEY = 'rootin.theme';
const VALID_THEMES = ['classic', 'gameboy', 'dark'];

function readInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(saved) ? saved : 'gameboy';
  } catch {
    return 'gameboy';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
    // CSS 스코프 훅. 'dark'는 클래식과 같은 컴포넌트/스코프를 쓰는 팔레트 변형이므로
    // data-theme(마크업 family)는 classic으로 둔다. 다크 색은 app.jsx가 .dark 클래스로 입힌다.
    document.body.dataset.theme = theme === 'gameboy' ? 'gameboy' : 'classic';
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'gameboy' ? 'classic' : 'gameboy'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
