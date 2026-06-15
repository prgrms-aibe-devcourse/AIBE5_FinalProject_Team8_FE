import { useState, useEffect, useCallback } from 'react';
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
import { logout, clearTokens } from './api/auth.js';
import { GuideOverlay } from './components/GuideOverlay.jsx';

// 각 화면에 표시될 가이드 오버레이 설명 및 좌표 매핑 정보
const GUIDE_STEPS = {
  dashboard: [
    { selector: '.guide-dashboard-greeting', text: '📝 오늘의 한 줄과 현재 연속 기록을 확인하고, [오늘 기록하기]로 새 TIL 작성을 시작합니다.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-dashboard-stats', text: '📊 누적 TIL 개수, 연속 기록일수, 전체 글자 수, 보유 포인트를 요약하여 보여주는 학습 지표판입니다.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-dashboard-grass', text: '🌱 작성한 글 수에 따라 달력에 초록색 잔디가 심어지며, 공부량이 많을수록 잔디 색상이 더 짙어집니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-goals', text: '🎯 매일 주어지는 목표를 확인하고, 완료한 목표만큼 물방울 포인트를 받을 수 있습니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-streak', text: '🔥 최근 30일 작성량과 현재/최고 연속 기록을 함께 확인할 수 있습니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-distribution', text: '📊 가꾸고 있는 여러 화분(주제) 중 어떤 분야를 가장 많이 공부했는지 비율로 분석해 줍니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-weekly', text: '📅 이번 주 요일별로 글을 작성한 횟수를 그래프로 시각화하여 주간 학습 패턴을 파악합니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-interests', text: '📈 시간의 흐름에 따라 나의 주된 학습 관심사가 어떻게 변화하고 이동해왔는지 보여줍니다.', placement: 'top', textOffset: { x: -80, y: -30 } }
  ],
  garden: [
    { selector: '.guide-garden-scene', text: '🌿 매일 학습 기록(TIL)을 통해 키워낸 나의 식물들을 한눈에 모아 감상하는 정원 캔버스입니다.', placement: 'top', textOffset: { x: -120, y: -35 } },
    { selector: '.guide-garden-pots', text: '🪴 키우는 화분의 레벨과 물주기 상태를 확인하고, 수확한 식물로 화분 위를 꾸밀 수 있습니다.', placement: 'top', textOffset: { x: 120, y: -20 } },
    { selector: '.guide-garden-edit', text: '🎨 [정원 꾸미기] 버튼을 누르면 화분의 위치나 테마를 자유롭게 바꿀 수 있는 꾸미기 모드가 켜집니다.', placement: 'bottom', textOffset: { x: -50, y: 15 } },
    { selector: '.guide-garden-scene', action: 'enableGardenEditMode', text: '🖐️ 꾸미기 모드에서 화분을 클릭한 채 원하는 위치로 끌어다 놓으면 자유롭게 배치할 수 있습니다.', placement: 'top', textOffset: { x: -120, y: -35 } },
    { selector: '.guide-garden-theme', action: 'enableGardenEditMode', text: '🖼️ 숲, 가을, 밤, 미니룸 등 원하는 테마 버튼을 선택하여 정원의 배경을 취향대로 변경합니다.', placement: 'left', textOffset: { x: -30, y: 0 } },
    { selector: '.guide-garden-edit', action: 'enableGardenEditMode', text: '💾 [꾸미기 완료] 버튼을 누르면 화분 배치와 정원 꾸미기 변경사항이 저장됩니다.', placement: 'bottom', textOffset: { x: -50, y: 15 } }
  ],
  editor: [
    { selector: '.guide-editor-meta', text: '글을 누적할 대상 화분을 고르고 제목과 태그를 입력하는 메타정보 영역입니다.', placement: 'left', textOffset: { x: -80, y: 30 } },
    { selector: '.guide-editor-toolbar', text: '글자 굵기, 이미지 업로드, 수학 공식 등의 서식을 적용할 수 있는 에디터 툴바입니다.', placement: 'bottom', textOffset: { x: -160, y: 15 } },
    { selector: '.guide-editor-content', text: '오늘 학습한 내용을 자유롭게 작성하는 에디터 본문입니다. 마크다운 단축키를 활용할 수 있습니다.', placement: 'right', textOffset: { x: 80, y: -30 } },
    { selector: '.guide-editor-status', text: '글을 임시 저장하거나 발행하는 버튼입니다. 최종 발행하면 선택한 화분에 물주기와 경험치 반영이 진행됩니다.', placement: 'top', textOffset: { x: 0, y: -25 } }
  ],
  ai: [
    { selector: '.guide-ai-mode', text: '🎯 AI 학습 목적을 선택합니다.\n\n- 복습 문제 생성: TIL을 분석해 퀴즈를 만듭니다.\n- TIL 요약: 공부한 내용의 핵심 요약본을 만듭니다.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-ai-pots', text: 'AI가 학습 지식을 분석할 기준 화분을 목록에서 선택합니다. 해당 화분의 글들로 학습지가 제작됩니다.', placement: 'right', textOffset: { x: 40, y: -20 } },
    { selector: '.guide-ai-select-til', text: '학습에 활용할 개별 TIL 글 목록을 확인하고 직접 선택하기 위해 이 버튼을 클릭합니다.', placement: 'bottom', textOffset: { x: 0, y: 10 } },
    { selector: '.guide-ai-modal-list', action: 'openAiTilModal', text: '학습 데이터로 사용할 개별 TIL 글들을 선택합니다. 검색바나 태그 필터로 원하는 공부 기록만 빠르게 골라낼 수 있습니다.', placement: 'left', textOffset: { x: -60, y: 0 } },
    { selector: '.guide-ai-modal-submit', action: 'openAiTilModal', text: '하단의 생성 버튼을 눌러 AI 학습지를 발행합니다. 공부 분량과 모드에 따라 물방울 포인트가 차감됩니다.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-ai-result', action: 'showAiGuideResult', text: 'AI가 출제한 퀴즈를 풀고 채점받거나 요약된 개념 노트를 학습하는 메인 결과 화면입니다.', placement: 'left', textOffset: { x: -40, y: 0 } }
  ]
};

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
  // 좌측 사이드바 열림 상태는 SidebarProvider가 controlled라 새로고침 시 쿠키(sidebar_state)에서 복원
  const [leftOpen, setLeftOpen] = useState(() => {
    if (typeof document === 'undefined') return true;
    const m = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
    return m ? m[1] === 'true' : true;
  });
  const [rightOpen, setRightOpen] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('rootin.tilRightOpen') : null;
    return v === null ? true : v === 'true';
  });
  const [focusMode, setFocusMode] = useState(false);
  const [collectionStats, setCollectionStats] = useState(null);

  // 도움말 가이드의 오픈 여부를 담당하는 상태
  const [guideOpen, setGuideOpen] = useState(false);

  const toggleRightPanel = () => setRightOpen((o) => {
    const next = !o;
    try { localStorage.setItem('rootin.tilRightOpen', String(next)); } catch { /* noop */ }
    return next;
  });
  const toggleFocusMode = () => setFocusMode((f) => !f);
  const screen = getScreenFromPath(location.pathname);
  const routePotId = getPotIdFromPath(location.pathname);
  const editorQueryPotId = getEditorPotIdFromSearch(location.search);
  const activeEditorPotId = editorQueryPotId ?? editorInitialPotId;
  const guideStorageKey = GUIDE_STEPS[screen] ? `rootin.visitedGuide.${screen}` : null;

  const closeGuide = useCallback(() => {
    if (guideStorageKey) {
      try { localStorage.setItem(guideStorageKey, 'true'); } catch { /* noop */ }
    }
    setGuideOpen(false);
  }, [guideStorageKey]);

  // 각 화면(대시보드, 정원, 에디터, AI 학습 등)별 최초 방문 시 도움말 가이드 투어가 자동으로 1회 실행되는 로직입니다.
  useEffect(() => {
    if (authed && guideStorageKey) {
      const hasVisited = localStorage.getItem(guideStorageKey);
      if (!hasVisited) {
        const timer = setTimeout(() => {
          setGuideOpen(true);
        }, 1000); // 1초 뒤 각 화면의 UI 컴포넌트 렌더링이 안착되면 부드럽게 가이드를 실행합니다.
        return () => clearTimeout(timer);
      }
    }
  }, [authed, guideStorageKey]);


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
        style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)', minWidth: 1180, '--sidebar-width': '18rem' }}
        data-screen-label={screen}
      >
        <RootinSidebarLeft
          current={screen.startsWith('pot') ? 'garden' : screen}
          onNav={handleNav}
          onLogout={() => setLogoutModalOpen(true)}
        />
        <SidebarInset style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, margin: 0, background: 'transparent' }}>
          {screen !== 'editor' && (
            <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2">
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
              </div>
              {/* 도움말(?) 버튼 추가 */}
              {['dashboard', 'garden', 'ai'].includes(screen) && (
                <button
                  onClick={() => setGuideOpen(true)}
                  className="flex items-center justify-center border hover:bg-muted text-muted-foreground transition-all duration-200"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    borderColor: 'var(--rule-2)',
                    backgroundColor: 'var(--paper)',
                    color: 'var(--ink-2)',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.06)'
                  }}
                  title="이 화면의 이용 가이드 맵 켜기"
                >
                  ?
                </button>
              )}
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
              <Route path="/ai" element={<AIScreen onOpenGuide={() => setGuideOpen(true)} />} />
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
        {/* 가이드 오버레이 컴포넌트 마운트 */}
        {guideOpen && GUIDE_STEPS[screen] && (
          <GuideOverlay
            isOpen={guideOpen}
            onClose={closeGuide}
            steps={GUIDE_STEPS[screen]}
          />
        )}
        {/* 에디터 전용 플로팅 도움말 버튼 */}
        {screen === 'editor' && !focusMode && (
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center justify-center border hover:bg-muted text-muted-foreground transition-all duration-200"
            style={{
              position: 'fixed',
              right: '16px', // 다른 페이지들의 우측 상단 헤더 도움말 버튼과 동일하게 맞춥니다.
              top: '16px',
              zIndex: 100,
              width: 32,
              height: 32,
              borderRadius: '50%',
              borderColor: 'var(--rule-2)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink-2)',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            title="에디터 가이드 맵 켜기"
          >
            ?
          </button>
        )}
      </SidebarProvider>
      {logoutModalOpen && (
        <LogoutConfirmModal
          onConfirm={async () => {
            try {
              await logout().catch(() => { }); // 서버 세션 무효화 (best-effort)
            } finally {
              clearTokens();
              clearUser();
              setAuthed(false);
              setLogoutModalOpen(false);
              navigate('/landing', { replace: true });
            }
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
  const handleAuthExpired = useCallback(() => {
    // 토큰 만료 시 페이지 리로드로 로그아웃 처리
    window.location.reload();
  }, []);

  return (
    <BrowserRouter>
      <UserProvider onAuthExpired={handleAuthExpired}>
        <AppShell />
      </UserProvider>
    </BrowserRouter>
  );
}


export default App;
