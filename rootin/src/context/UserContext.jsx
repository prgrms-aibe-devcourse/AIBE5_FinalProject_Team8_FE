import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(null);

/**
 * API 응답 필드를 앱 내부 필드명으로 정규화
 * - nickname  → name
 * - point     → points
 * - tilCount  → totalTil
 * - streak, bestStreak, joinedAt 은 API 미지원 → 기본값 0 / 0 / ''
 */
function normalizeUser(apiUser) {
  if (!apiUser) return null;
  return {
    name:        apiUser.nickname ?? '',
    handle:      apiUser.handle   ?? apiUser.nickname ?? '',
    email:       apiUser.email    ?? '',
    bio:         apiUser.bio      ?? '',
    joinedAt:    apiUser.joinedAt ?? '',
    totalTil:    apiUser.tilCount ?? 0,
    points:      apiUser.point    ?? 0,
    streak:      apiUser.streak      ?? 0,
    bestStreak:  apiUser.bestStreak  ?? 0,
    profileImageUrl: apiUser.profileImageUrl ?? null,
    userId:      apiUser.userId   ?? null,
    provider:    apiUser.provider ?? null,
  };
}

export function UserProvider({ children, initialUser = null, onAuthExpired }) {
  const [user, setUser] = useState(initialUser ? normalizeUser(initialUser) : null);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    if (initialUser) {
      setUser(normalizeUser(initialUser));
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    import('../api/user.js').then(({ getMe }) =>
      getMe()
        .then(data => {
          setUser(normalizeUser(data));
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setLoading(false);
          onAuthExpired?.();
        })
    );
  }, []);

  /** 로그인 성공 후 외부에서 유저 정보 주입 */
  function setUserFromApi(apiUser) {
    setUser(normalizeUser(apiUser));
  }

  /** 로그아웃 시 초기화 */
  function clearUser() {
    setUser(null);
  }

  return (
    <UserContext.Provider value={{ user, loading, setUserFromApi, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
