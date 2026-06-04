import { useState, useMemo } from 'react';
import { POTS, DEX } from './data.jsx';
import { Icon } from './ui.jsx';
import { Plant, RootinLogo } from './plants.jsx';
import { DashboardScreen } from './screens-dashboard.jsx';
import { EditorScreen } from './screens-editor.jsx';
import { GardenScreen, PotDetailScreen } from './screens-garden.jsx';
import { CollectionScreen, AIScreen, ProfileScreen, AuthScreen } from './screens-rest.jsx';
import { LandingScreen } from './screens-landing.jsx';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { RootinSidebarLeft } from '@/components/RootinSidebarLeft.jsx';
import { RootinSidebarRight } from '@/components/RootinSidebarRight.jsx';
import { TilEditorProvider } from '@/components/til/til-editor-context';

// App shell — sidebar + topbar + screen routing

const NAV = [
  { id: 'dashboard', label: '대시보드', icon: Icon.home },
  { id: 'editor',    label: 'TIL 작성',  icon: Icon.edit },
  { id: 'garden',    label: '정원',      icon: Icon.garden },
  { id: 'collection',label: '식물도감',  icon: Icon.book },
  { id: 'ai',        label: 'AI 학습',   icon: Icon.sparkles },
  { id: 'profile',   label: '프로필',    icon: Icon.user },
];

// Old custom Sidebar and TopBar removed and replaced by Shadcn UI

function AppShell() {
  const { setUserFromApi, clearUser } = useUser();
  const [screen, setScreen] = useState('dashboard');
  const [authed, setAuthed] = useState(!!localStorage.getItem('accessToken'));
  const [showLanding, setShowLanding] = useState(!localStorage.getItem('accessToken'));
  const [potFocus, setPotFocus] = useState(null);
  const [editorInitialPotId, setEditorInitialPotId] = useState(null);
  const [editorInitialTil, setEditorInitialTil] = useState(null);
  const [editorReturnScreen, setEditorReturnScreen] = useState(null);
  const [potDetailRefreshKey, setPotDetailRefreshKey] = useState(0);

  const handleNav = (nextScreen) => {
    if (nextScreen === 'editor') {
      setEditorInitialPotId(null);
      setEditorInitialTil(null);
      setEditorReturnScreen(null);
    }
    setScreen(nextScreen);
  };

  const openEditorForPot = (potId) => {
    setPotFocus(potId);
    setEditorInitialPotId(potId);
    setEditorInitialTil(null);
    setEditorReturnScreen('pot-detail');
    setScreen('editor');
  };

  const openEditorForTil = (til) => {
    setEditorInitialPotId(til?.potId ?? null);
    setEditorInitialTil(til);
    setEditorReturnScreen('pot-detail');
    setScreen('editor');
  };

  const handleTilPublished = (publishedPotId) => {
    if (editorReturnScreen === 'pot-detail') {
      setPotFocus(publishedPotId ?? editorInitialPotId ?? potFocus);
      setPotDetailRefreshKey(key => key + 1);
    }
  };

  const unlockedDEXCount = useMemo(() => DEX.filter(d => d.state !== 'locked').length, [DEX]);

  const titles = {
    dashboard:  { title: '안녕하세요 🌱', subtitle: 'Dashboard · 오늘' },
    editor:     { title: '오늘의 TIL 작성', subtitle: 'New entry' },
    garden:     { title: '나의 정원', subtitle: 'Garden · 4개의 화분' },
    'pot-detail': {
      title: potFocus
        ? `${POTS.find(p => p.id === potFocus)?.emoji ?? '🌱'} ${POTS.find(p => p.id === potFocus)?.name ?? '화분 상세'}`
        : '화분',
      subtitle: 'Garden / Detail',
    },
    collection: { title: '식물 도감', subtitle: `Collection · ${unlockedDEXCount} / ${DEX.length} 종 해금` },
    ai:         { title: 'AI 학습 도구', subtitle: 'AI · 내 TIL로 만든 학습지' },
    profile:    { title: '내 계정', subtitle: 'Account' },
  };

  if (!authed && showLanding) return (
    <LandingScreen onStart={() => setShowLanding(false)} />
  );

  if (!authed) return (
    <AuthScreen onAuth={(userData) => {
      setUserFromApi(userData);
      setAuthed(true);
    }} />
  );

  const meta = titles[screen] || { title: '', subtitle: '' };

  return (
    <TilEditorProvider>
    <SidebarProvider
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)', minWidth: 1180 }}
      data-screen-label={screen}
    >
      <RootinSidebarLeft
        current={screen.startsWith('pot') ? 'garden' : screen}
        onNav={handleNav}
        onLogout={() => {
          import('./api/auth.js').then(({ logout }) => logout().catch(() => {}));
          clearUser();
          setAuthed(false);
        }}
      />
      <SidebarInset style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, margin: 0, background: 'transparent' }}>
        {screen !== 'editor' && (
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); handleNav('dashboard'); }}>
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
          {screen === 'dashboard'  && <DashboardScreen onNav={handleNav} />}
          {screen === 'editor'     && (
            <EditorScreen
              onNav={handleNav}
              initialSelectedPotId={editorInitialPotId}
              initialTil={editorInitialTil}
              afterPublishScreen={editorReturnScreen ?? 'dashboard'}
              onPublished={handleTilPublished}
            />
          )}
          {screen === 'garden'     && <GardenScreen onOpenPot={(id) => { setPotFocus(id); setScreen('pot-detail'); }} />}
          {screen === 'pot-detail' && (
            <PotDetailScreen
              potId={potFocus}
              refreshKey={potDetailRefreshKey}
              onBack={() => setScreen('garden')}
              onStartTil={openEditorForPot}
              onEditTil={openEditorForTil}
            />
          )}
          {screen === 'collection' && <CollectionScreen />}
          {screen === 'ai'         && <AIScreen />}
          {screen === 'profile'    && <ProfileScreen />}
        </div>
      </SidebarInset>
      {screen === 'editor' && <RootinSidebarRight />}
    </SidebarProvider>
    </TilEditorProvider>
  );
}

function App() {
  return (
    <UserProvider onAuthExpired={() => {
      // 토큰 만료 시 페이지 리로드로 로그아웃 처리
      window.location.reload();
    }}>
      <AppShell />
    </UserProvider>
  );
}


export default App;
