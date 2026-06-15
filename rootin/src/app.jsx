import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { getPlants } from './api/collection.js';
import { DashboardScreen } from './screens-dashboard.jsx';
import { EditorScreen } from './screens-editor.jsx';
import { GardenScreen, PotDetailScreen, TilDetailScreen } from './screens-garden.jsx';
import { CollectionScreen, AIScreen, ProfileScreen, AuthScreen } from './screens-rest.jsx';
import { LandingScreen } from './screens-landing.jsx';
import { NotFoundScreen } from './screens-error.jsx';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GameBoySidebar } from '@/components/GameBoySidebar.jsx';
import { RootinSidebarLeft } from '@/components/RootinSidebarLeft.jsx';
import { RootinSidebarRight } from '@/components/RootinSidebarRight.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { DashboardScreen as DashboardClassic } from './screens-dashboard.classic.jsx';
import { GardenScreen as GardenClassic, PotDetailScreen as PotDetailClassic } from './screens-garden.classic.jsx';
import { CollectionScreen as CollectionClassic, AIScreen as AIClassic, ProfileScreen as ProfileClassic } from './screens-rest.classic.jsx';
import { LogoutConfirmModal as LogoutConfirmModalClassic } from '@/components/LogoutConfirmModal.classic.jsx';
import { EditorScreen as EditorClassic } from './screens-editor.classic.jsx';
import { RootinSidebarRight as RootinSidebarRightClassic } from '@/components/RootinSidebarRight.classic.jsx';
import { TilEditorProvider as TilEditorProviderClassic } from '@/components/til-classic/til-editor-context';
import { TilEditorProvider } from '@/components/til/til-editor-context';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal.jsx';
import { logout, clearTokens } from './api/auth.js';

// App shell — sidebar + topbar + route-based screen routing

// Old custom Sidebar and TopBar removed and replaced by Shadcn UI

function AppShell() {
  const { setUserFromApi, clearUser } = useUser();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(!!localStorage.getItem('accessToken'));
  const [potFocus, setPotFocus] = useState(null);
  const [editorInitialPotId, setEditorInitialPotId] = useState(null);
  const [editorInitialTil, setEditorInitialTil] = useState(null);
  const [editorReturnScreen, setEditorReturnScreen] = useState(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [potDetailRefreshKey, setPotDetailRefreshKey] = useState(0);
  const [gardenRefreshKey, setGardenRefreshKey] = useState(0);
  // 발행 후 화분 복귀 시 식물 성장 연출(물주기)을 1회 발동시키는 신호.
  // "이 화분을 축하하라"는 일회성 potId. 화면이 소비하면 onCelebrated로 다시 null이 된다.
  // (카운터 대신 potId를 쓰는 이유: 화분 상세는 발행 직후 새로 마운트되므로
  //  마운트 시점 값과의 비교로는 변화를 감지할 수 없다.)
  const [growthCelebratePotId, setGrowthCelebratePotId] = useState(null);
  // 에디터 화면 UI 상태 — 좌측 사이드바(controlled), 오른쪽 아일랜드 패널, 집중 모드
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('rootin.tilRightOpen') : null;
    return v === null ? true : v === 'true';
  });
  const [focusMode, setFocusMode] = useState(false);
  const [collectionStats, setCollectionStats] = useState(null);

  const toggleRightPanel = () => setRightOpen((o) => {
    const next = !o;
    try { localStorage.setItem('rootin.tilRightOpen', String(next)); } catch { /* noop */ }
    return next;
  });
  const toggleFocusMode = () => setFocusMode((f) => !f);

  const confirmLogout = async () => {
    try {
      await logout().catch(() => {}); // 서버 세션 무효화 (best-effort)
    } finally {
      clearTokens();
      clearUser();
      setAuthed(false);
      setLogoutModalOpen(false);
      navigate('/landing', { replace: true });
    }
  };
  const closeLogoutModal = () => setLogoutModalOpen(false);

  useEffect(() => {
    if (!authed) {
      setCollectionStats(null);
      return;
    }

    let active = true;

    getPlants()
      .then(data => {
        if (active) {
          setCollectionStats(data?.stats ?? null);
        }
      })
      .catch(error => {
        if (active) {
          console.error('식물도감 요약 조회 중 오류 발생:', error);
        }
      });

    return () => { active = false; };
  }, [authed]);

  const screen = getScreenFromPath(location.pathname);
  // 풀스크린 비전-디스플레이 프레임(어두운 룸 + 모니터 베젤)을 적용할 화면.
  // 게임보이/CRT로 개편된 화면을 여기에 추가하면 양쪽 여백 없이 풀폭 + 테두리가 입혀진다.
  const baseFramed = screen === 'dashboard' || screen === 'garden' || screen === 'pot-detail' || screen === 'collection' || screen === 'ai' || screen === 'profile';
  // 테마 토글: classic 테마에서는 게임보이 베젤/사이드바를 끄고 원본 셸(RootinSidebarLeft)로 렌더한다.
  // 대상 화면(대시보드/정원/화분상세/도감/AI/프로필)은 classic 구현이 있다. 에디터·TIL상세는 게임보이 유지.
  const CLASSIC_SHELL_SCREENS = ['dashboard', 'garden', 'pot-detail', 'collection', 'ai', 'profile', 'editor'];
  const useClassicShell = theme === 'classic' && CLASSIC_SHELL_SCREENS.includes(screen);
  const framed = baseFramed && !useClassicShell;
  // 에디터 스택을 테마별로 선택 (Provider·화면·우측 패널은 같은 til 트리/컨텍스트끼리 묶여야 한다)
  const isClassic = theme === 'classic';
  const TilProvider = isClassic ? TilEditorProviderClassic : TilEditorProvider;
  const EditorComp = isClassic ? EditorClassic : EditorScreen;
  const RightPanel = isClassic ? RootinSidebarRightClassic : RootinSidebarRight;
  const reduceMotion = useReducedMotion();
  const routePotId = getPotIdFromPath(location.pathname);
  const editorQueryPotId = getEditorPotIdFromSearch(location.search);
  const activeEditorPotId = editorQueryPotId ?? editorInitialPotId;

  // TIL 작성 페이지에 진입할 때마다 오른쪽 패널(템플릿/임시저장)을 항상 펼친다.
  // (진입 시점에만 강제로 열고, 이후 세션 내 토글은 그대로 동작)
  useEffect(() => {
    if (screen === 'editor') setRightOpen(true);
  }, [screen]);

  const handleNav = (nextScreen) => {
    setFocusMode(false);
    if (nextScreen?.startsWith?.('/')) {
      navigate(nextScreen);
      return;
    }
    if (nextScreen === 'editor') {
      setEditorInitialPotId(null);
      setEditorInitialTil(null);
      setEditorReturnScreen(null);
    }
    navigate(screenToPath(nextScreen, potFocus));
  };

  const openEditorForPot = (potId) => {
    setPotFocus(potId);
    setEditorInitialPotId(potId);
    setEditorInitialTil(null);
    setEditorReturnScreen(`/garden/pots/${potId}`);
    navigate(`/editor?potId=${potId}`);
  };

  const openEditorForTil = (til) => {
    const returnPotId = til?.potId ?? potFocus ?? routePotId;
    setEditorInitialPotId(returnPotId ?? null);
    setEditorInitialTil(til);
    setEditorReturnScreen(returnPotId ? `/garden/pots/${returnPotId}` : '/garden');
    navigate(returnPotId ? `/editor?potId=${returnPotId}` : '/editor');
  };

  // 사이드바에서 임시저장본 "이어쓰기" — 수정 모드를 해제해 신규 작성 상태로 되돌림
  // (에디터 본문 적용은 context.resumeDraft가 담당)
  const resumeEditorDraft = (potId) => {
    setEditorInitialPotId(potId ?? null);
    setEditorInitialTil(null);
    navigate(potId ? `/editor?potId=${potId}` : '/editor', { replace: true });
  };

  // 사이드바 "새 TIL 작성" — 수정 모드 해제(신규 작성 상태). 선택한 화분은 유지.
  // (에디터 비우기는 context.startNewTil이 담당)
  const startNewEditorTil = () => {
    setEditorInitialTil(null);
  };

  const handleTilPublished = (publishedPotId) => {
    if (editorReturnScreen?.startsWith?.('/garden/pots/')) {
      // publishedPotId는 에디터의 selectedPotId(문자열)에서 오므로 숫자로 정규화한다.
      // (라우트 potId는 숫자라 문자열과 비교하면 연출이 발동하지 않는다.)
      const celebratePotId = parseRoutePotId(publishedPotId) ?? editorInitialPotId ?? potFocus;
      setPotFocus(celebratePotId);
      setPotDetailRefreshKey(key => key + 1);
      setGrowthCelebratePotId(celebratePotId);
    } else if (editorReturnScreen === '/garden') {
      setGardenRefreshKey(key => key + 1);
    }
  };

  const syncEditorPotQuery = (selectedPotId) => {
    if (!isRoutePath(location.pathname, 'editor')) return;
    const numericPotId = parseRoutePotId(selectedPotId);
    setEditorInitialPotId(numericPotId ?? null);
    const nextPath = numericPotId ? `/editor?potId=${numericPotId}` : '/editor';
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath !== nextPath) {
      navigate(nextPath, { replace: true });
    }
  };

  if (!authed) {
    return (
      <Routes>
        <Route path="/landing" element={<LandingScreen onStart={() => navigate('/login')} />} />
        <Route path="/login" element={(
          <AuthScreen
            onBackToLanding={() => navigate('/landing')}
            onAuth={(userData) => {
              setUserFromApi(userData);
              setAuthed(true);
              navigate('/dashboard', { replace: true });
            }}
          />
        )} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    );
  }

  return (
    <TilProvider>
    <SidebarProvider
      open={focusMode ? false : leftOpen}
      onOpenChange={setLeftOpen}
      style={{
        display: 'flex', minHeight: '100vh', minWidth: 1180,
        // 게임보이 에디터·TIL 상세는 베젤 없는 크림 화면. classic 에디터는 원본 종이 배경(var(--paper)).
        background: framed ? 'transparent' : ((!useClassicShell && (screen === 'editor' || screen === 'til-detail')) ? '#efe7d3' : 'var(--paper)'),
        position: framed ? 'relative' : undefined,
        zIndex: framed ? 0 : undefined,
      }}
      data-screen-label={screen}
    >
      {framed && <><div className="rt-vision-room" /><div className="rt-vision-screen-bg" /></>}
      {useClassicShell ? (
        <RootinSidebarLeft
          current={screen.startsWith('pot') || screen === 'til-detail' ? 'garden' : screen}
          onNav={handleNav}
          onLogout={() => setLogoutModalOpen(true)}
        />
      ) : (
        <GameBoySidebar
          current={screen.startsWith('pot') || screen === 'til-detail' ? 'garden' : screen}
          onNav={handleNav}
          onLogout={() => setLogoutModalOpen(true)}
          forceHidden={focusMode}
        />
      )}
      <SidebarInset style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, margin: 0, background: 'transparent' }}>
        <div className="scrollbar" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={theme === 'classic' ? <DashboardClassic onNav={handleNav} /> : <DashboardScreen onNav={handleNav} />} />
            <Route path="/editor" element={(
              <EditorComp
                onNav={handleNav}
                initialSelectedPotId={activeEditorPotId}
                initialTil={editorInitialTil}
                afterPublishScreen={editorReturnScreen ?? (activeEditorPotId ? `/garden/pots/${activeEditorPotId}` : '/dashboard')}
                onPublished={handleTilPublished}
                onSelectedPotChange={syncEditorPotQuery}
                focusMode={focusMode}
                onToggleFocus={toggleFocusMode}
              />
            )} />
            <Route path="/garden" element={theme === 'classic'
              ? <GardenClassic refreshKey={gardenRefreshKey} onOpenPot={(id) => { setPotFocus(id); navigate(`/garden/pots/${id}`); }} />
              : <GardenScreen refreshKey={gardenRefreshKey} onOpenPot={(id) => { setPotFocus(id); navigate(`/garden/pots/${id}`); }} />} />
            <Route path="/garden/pots/:potId" element={(
              <PotDetailRoute
                theme={theme}
                refreshKey={potDetailRefreshKey}
                celebratePotId={growthCelebratePotId}
                onCelebrated={() => setGrowthCelebratePotId(null)}
                onBack={() => navigate('/garden')}
                onStartTil={openEditorForPot}
                onEditTil={openEditorForTil}
                onOpenTil={(potId, tilId) => navigate(`/garden/pots/${potId}/tils/${tilId}`)}
              />
            )} />
            <Route path="/garden/pots/:potId/tils/:tilId" element={(
              <TilDetailRoute
                onBack={(potId) => navigate(`/garden/pots/${potId}`)}
                onEdit={openEditorForTil}
                onDeleted={(potId) => {
                  setPotDetailRefreshKey(key => key + 1);
                  navigate(`/garden/pots/${potId}`);
                }}
              />
            )} />
            <Route path="/collection" element={theme === 'classic' ? <CollectionClassic /> : <CollectionScreen />} />
            <Route path="/ai" element={theme === 'classic' ? <AIClassic /> : <AIScreen />} />
            <Route path="/profile" element={theme === 'classic' ? <ProfileClassic /> : <ProfileScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </div>
      </SidebarInset>
      {screen === 'editor' && !focusMode && (
        <RightPanel
          onEditTil={openEditorForTil}
          onResumeDraft={resumeEditorDraft}
          onNewTil={startNewEditorTil}
          open={rightOpen}
          onToggle={toggleRightPanel}
        />
      )}
      {/* 모니터 베젤 — 화면 전환 시 부드럽게 등장/소멸.
          에디터 진입(framed→false): 베젤이 확대되며 페이드아웃 → 모니터 속으로 빨려들어가는 느낌.
          에디터 이탈(false→framed): 베젤이 제자리로 모이며 페이드인. */}
      <AnimatePresence initial={false}>
        {framed && (
          <motion.div
            key="vision-frame"
            className="rt-vision-frame"
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.18 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.55, ease: [0.4, 0, 0.7, 1] }}
          >
            <span className="vf-label">ROOTIN VISION-DISPLAY · 16:9 DOT MATRIX</span>
            <div className="vf-brand">
              <span className="vf-led" /><span>POWER</span>
              <span className="vf-word">Rootin</span>
              <span>DOT-MATRIX VISION DISPLAY™ · MODEL RT-9</span>
            </div>
            <div className="vf-grille"><i /><i /><i /><i /><i /><span className="vf-knob" /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarProvider>
    {logoutModalOpen && (theme === 'classic'
      ? <LogoutConfirmModalClassic onConfirm={confirmLogout} onClose={closeLogoutModal} />
      : <LogoutConfirmModal onConfirm={confirmLogout} onClose={closeLogoutModal} />
    )}
    </TilProvider>
  );
}

function PotDetailRoute({ theme, refreshKey, celebratePotId, onCelebrated, onBack, onStartTil, onEditTil, onOpenTil }) {
  const { potId } = useParams();
  const numericPotId = parseRoutePotId(potId);

  if (numericPotId == null) {
    return <Navigate to="/garden" replace />;
  }

  // classic 화분 상세는 TIL을 전용 라우트가 아니라 에디터(onEditTil)로 연다.
  if (theme === 'classic') {
    return (
      <PotDetailClassic
        potId={numericPotId}
        refreshKey={refreshKey}
        onBack={onBack}
        onStartTil={onStartTil}
        onEditTil={onEditTil}
      />
    );
  }

  return (
    <PotDetailScreen
      potId={numericPotId}
      refreshKey={refreshKey}
      celebratePotId={celebratePotId}
      onCelebrated={onCelebrated}
      onBack={onBack}
      onStartTil={onStartTil}
      onOpenTil={(tilId) => onOpenTil(numericPotId, tilId)}
    />
  );
}

function TilDetailRoute({ onBack, onEdit, onDeleted }) {
  const { potId, tilId } = useParams();
  const numericPotId = parseRoutePotId(potId);
  const numericTilId = parseRoutePotId(tilId);

  if (numericPotId == null || numericTilId == null) {
    return <Navigate to="/garden" replace />;
  }

  return (
    <TilDetailScreen
      tilId={numericTilId}
      onBack={() => onBack(numericPotId)}
      onEdit={onEdit}
      onDeleted={() => onDeleted(numericPotId)}
    />
  );
}

function getScreenFromPath(pathname) {
  if (/^\/garden\/pots\/[^/]+\/tils\/[^/]+$/.test(pathname)) return 'til-detail';
  if (/^\/garden\/pots\/[^/]+$/.test(pathname)) return 'pot-detail';
  if (isRoutePath(pathname, 'editor')) return 'editor';
  if (isRoutePath(pathname, 'garden')) return 'garden';
  if (isRoutePath(pathname, 'collection')) return 'collection';
  if (isRoutePath(pathname, 'ai')) return 'ai';
  if (isRoutePath(pathname, 'profile')) return 'profile';
  return 'dashboard';
}

function getPotIdFromPath(pathname) {
  const match = pathname.match(/^\/garden\/pots\/([^/]+)$/);
  if (!match) return null;
  return parseRoutePotId(match[1]);
}

function getEditorPotIdFromSearch(search) {
  const params = new URLSearchParams(search);
  return parseRoutePotId(params.get('potId'));
}

function screenToPath(screen, potId) {
  if (screen === 'pot-detail') return potId ? `/garden/pots/${potId}` : '/garden';
  const paths = {
    dashboard: '/dashboard',
    editor: '/editor',
    garden: '/garden',
    collection: '/collection',
    ai: '/ai',
    profile: '/profile',
  };
  return paths[screen] ?? '/dashboard';
}

function parseRoutePotId(potId) {
  if (!/^[1-9]\d*$/.test(String(potId ?? ''))) return null;
  const numericPotId = Number(potId);
  return Number.isSafeInteger(numericPotId) ? numericPotId : null;
}

function isRoutePath(pathname, route) {
  return pathname === `/${route}` || pathname.startsWith(`/${route}/`);
}

function App() {
  const handleAuthExpired = useCallback(() => {
    // 토큰 만료 시 페이지 리로드로 로그아웃 처리
    window.location.reload();
  }, []);

  return (
    <BrowserRouter>
      <UserProvider onAuthExpired={handleAuthExpired}>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </UserProvider>
    </BrowserRouter>
  );
}


export default App;
