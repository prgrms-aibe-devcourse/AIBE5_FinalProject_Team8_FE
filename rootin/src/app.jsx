import { useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { POTS } from './data.jsx';
import { getPlants } from './api/collection.js';
import { DashboardScreen } from './screens-dashboard.jsx';
import { EditorScreen } from './screens-editor.jsx';
import { GardenScreen, PotDetailScreen } from './screens-garden.jsx';
import { CollectionScreen, AIScreen, ProfileScreen, AuthScreen } from './screens-rest.jsx';
import { LandingScreen } from './screens-landing.jsx';
import { NotFoundScreen } from './screens-error.jsx';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { RootinSidebarLeft } from '@/components/RootinSidebarLeft.jsx';
import { RootinSidebarRight } from '@/components/RootinSidebarRight.jsx';
import { TilEditorProvider } from '@/components/til/til-editor-context';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal.jsx';

// App shell — sidebar + topbar + route-based screen routing

// Old custom Sidebar and TopBar removed and replaced by Shadcn UI

function AppShell() {
  const { setUserFromApi, clearUser } = useUser();
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

  useEffect(() => {
    getPlants()
      .then(data => setCollectionStats(data?.stats ?? null))
      .catch(() => {});
  }, []);

  const screen = getScreenFromPath(location.pathname);
  const routePotId = getPotIdFromPath(location.pathname);
  const editorQueryPotId = getEditorPotIdFromSearch(location.search);
  const activeEditorPotId = editorQueryPotId ?? editorInitialPotId;

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
      setPotFocus(publishedPotId ?? editorInitialPotId ?? potFocus);
      setPotDetailRefreshKey(key => key + 1);
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

  const titles = {
    dashboard:  { title: '안녕하세요 🌱', subtitle: 'Dashboard · 오늘' },
    editor:     { title: '오늘의 TIL 작성', subtitle: 'New entry' },
    garden:     { title: '나의 정원', subtitle: 'Garden · 4개의 화분' },
    'pot-detail': {
      title: (routePotId ?? potFocus)
        ? `${POTS.find(p => p.id === (routePotId ?? potFocus))?.emoji ?? '🌱'} ${POTS.find(p => p.id === (routePotId ?? potFocus))?.name ?? '화분 상세'}`
        : '화분',
      subtitle: 'Garden / Detail',
    },
    collection: {
      title: '식물 도감',
      subtitle: collectionStats
        ? `Collection · ${collectionStats.collected} / ${collectionStats.total} 종 해금`
        : 'Collection · 식물 도감',
    },
    ai:         { title: 'AI 학습 도구', subtitle: 'AI · 내 TIL로 만든 학습지' },
    profile:    { title: '내 계정', subtitle: 'Account' },
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

  const meta = titles[screen] || { title: '', subtitle: '' };

  return (
    <TilEditorProvider>
    <SidebarProvider
      open={focusMode ? false : leftOpen}
      onOpenChange={setLeftOpen}
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)', minWidth: 1180 }}
      data-screen-label={screen}
    >
      <RootinSidebarLeft
        current={screen.startsWith('pot') ? 'garden' : screen}
        onNav={handleNav}
        onLogout={() => setLogoutModalOpen(true)}
      />
      <SidebarInset style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, margin: 0, background: 'transparent' }}>
        {screen !== 'editor' && (
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" onClick={(e) => { e.preventDefault(); handleNav('dashboard'); }}>
                    Rootin
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{meta.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
        )}
        <div className="scrollbar" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardScreen onNav={handleNav} />} />
            <Route path="/editor" element={(
              <EditorScreen
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
            <Route path="/garden" element={<GardenScreen refreshKey={gardenRefreshKey} onOpenPot={(id) => { setPotFocus(id); navigate(`/garden/pots/${id}`); }} />} />
            <Route path="/garden/pots/:potId" element={(
              <PotDetailRoute
                refreshKey={potDetailRefreshKey}
                onBack={() => navigate('/garden')}
                onStartTil={openEditorForPot}
                onEditTil={openEditorForTil}
              />
            )} />
            <Route path="/collection" element={<CollectionScreen />} />
            <Route path="/ai" element={<AIScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </div>
      </SidebarInset>
      {screen === 'editor' && !focusMode && (
        <RootinSidebarRight
          onEditTil={openEditorForTil}
          onResumeDraft={resumeEditorDraft}
          onNewTil={startNewEditorTil}
          open={rightOpen}
          onToggle={toggleRightPanel}
        />
      )}
    </SidebarProvider>
    {logoutModalOpen && (
      <LogoutConfirmModal
        onConfirm={() => {
          import('./api/auth.js').then(({ logout }) => logout().catch(() => {}));
          clearUser();
          setAuthed(false);
          setLogoutModalOpen(false);
          navigate('/landing', { replace: true });
        }}
        onClose={() => setLogoutModalOpen(false)}
      />
    )}
    </TilEditorProvider>
  );
}

function PotDetailRoute({ refreshKey, onBack, onStartTil, onEditTil }) {
  const { potId } = useParams();
  const numericPotId = parseRoutePotId(potId);

  if (numericPotId == null) {
    return <Navigate to="/garden" replace />;
  }

  return (
    <PotDetailScreen
      potId={numericPotId}
      refreshKey={refreshKey}
      onBack={onBack}
      onStartTil={onStartTil}
      onEditTil={onEditTil}
    />
  );
}

function getScreenFromPath(pathname) {
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
  return (
    <BrowserRouter>
      <UserProvider onAuthExpired={() => {
        // 토큰 만료 시 페이지 리로드로 로그아웃 처리
        window.location.reload();
      }}>
        <AppShell />
      </UserProvider>
    </BrowserRouter>
  );
}


export default App;
