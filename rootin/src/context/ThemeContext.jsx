import { createContext, useContext, useEffect, useState } from 'react';

// 사이트 디자인 테마 — 'gameboy'(현재 라이브) / 'classic'(원본 디자인)
// 버튼 하나로 전환하며 localStorage에 보존한다.
const ThemeContext = createContext(null);
const STORAGE_KEY = 'rootin.theme';

function readInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'classic' || saved === 'gameboy' ? saved : 'gameboy';
  } catch {
    return 'gameboy';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
    // CSS 스코프 훅(필요 시 [data-theme]로 분기)
    document.body.dataset.theme = theme;
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
