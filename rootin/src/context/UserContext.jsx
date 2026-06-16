import { createContext, useContext, useState, useEffect, useRef } from 'react';

const UserContext = createContext(null);

/**
 * ISO 날짜 문자열을 한국어 형식(년 월 일)으로 변환
 * Invalid Date인 경우 빈 문자열 반환
 */
function formatKoreanDate(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * API 응답 필드를 앱 내부 필드명으로 정규화
 * - nickname  → name
 * - point     → points
 * - tilCount  → totalTil
 * - streak, bestStreak 은 API 미지원 → 기본값 0 / 0
 * - joinedAt: createdAt 필드로 매핑
 */
function normalizeUser(apiUser) {
  if (!apiUser) return null;
  return {
    name:        apiUser.nickname ?? '',
    handle:      apiUser.handle   ?? apiUser.nickname ?? '',
    email:       apiUser.email    ?? '',
    bio:         apiUser.bio      ?? '',
    joinedAt:    apiUser.createdAt ? formatKoreanDate(apiUser.createdAt) : '',
    totalTil:    apiUser.tilCount ?? 0,
    points:      apiUser.point    ?? 0,
    streak:      apiUser.streak      ?? 0,
    bestStreak:  apiUser.bestStreak  ?? 0,
    profileImageUrl: apiUser.profileImage ?? apiUser.profileImageUrl ?? null,
    userId:      apiUser.id       ?? apiUser.userId   ?? null,
    provider:    apiUser.provider ?? null,
  };
}

export function UserProvider({ children, initialUser = null, onAuthExpired }) {
  const [user, setUser] = useState(initialUser ? normalizeUser(initialUser) : null);
  const [loading, setLoading] = useState(!initialUser);
  const onAuthExpiredRef = useRef(onAuthExpired);

  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired;
  }, [onAuthExpired]);

  useEffect(() => {
    let active = true;

    if (initialUser) {
      setUser(normalizeUser(initialUser));
      setLoading(false);
      return () => { active = false; };
    }
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }

    async function loadUser() {
      try {
        const { getMe } = await import('../api/user.js');
        const data = await getMe();
        if (!active) return;
        const resolvedUserId = data?.id ?? data?.userId;
        if (resolvedUserId != null) {
          localStorage.setItem('userId', resolvedUserId);
        }
        try {
          const { getSummary } = await import('../api/dashboard.js');
          const summary = await getSummary();
          data.streak     = summary.currentStreak;
          data.bestStreak = summary.longestStreak;
        } catch {
          // 대시보드 요약 조회 실패는 로그인 상태 판정과 분리합니다.
        }
        if (!active) return;
        setUser(normalizeUser(data));
      } catch (error) {
        if (!active) return;
        if (error?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          onAuthExpiredRef.current?.();
          return;
        }
        console.error('사용자 정보 조회 중 오류 발생:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => { active = false; };
  }, [initialUser]);

  /** 로그인 성공 후 외부에서 유저 정보 주입 */
  function setUserFromApi(apiUser) {
    const resolvedUserId = apiUser?.id ?? apiUser?.userId;
    if (resolvedUserId != null) {
      localStorage.setItem('userId', resolvedUserId);
    }
    setUser(normalizeUser(apiUser));
  }

  /** 로그아웃 시 초기화 */
  function clearUser() {
    localStorage.removeItem('userId');
    setUser(null);
  }

  /** 프로필 수정 후 로컬 상태 부분 업데이트 */
  function updateUser(patch) {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <UserContext.Provider value={{ user, loading, setUserFromApi, clearUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
