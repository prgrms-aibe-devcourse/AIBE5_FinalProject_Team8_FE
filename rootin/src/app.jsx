import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardScreen } from './screens-dashboard.jsx';
import { EditorScreen } from './screens-editor.jsx';
import { GardenScreen, PotDetailScreen } from './screens-garden.jsx';
import { CollectionScreen, AIScreen, ProfileScreen, AuthScreen } from './screens-rest.jsx';
import { LandingScreen } from './screens-landing.jsx';
import { NotFoundScreen } from './screens-error.jsx';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { RootinSidebarLeft } from '@/components/RootinSidebarLeft.jsx';
import { RootinSidebarRight } from '@/components/RootinSidebarRight.jsx';
import { TilEditorProvider } from '@/components/til/til-editor-context';
import { LogoutConfirmModal } from '@/components/LogoutConfirmModal.jsx';
import { logout, clearTokens } from './api/auth.js';
import { GuideOverlay } from './components/GuideOverlay.jsx';

const GUIDE_STEPS = {
  dashboard: [
    { selector: '.guide-dashboard-greeting', text: '📝 오늘의 한 줄과 현재 연속 기록을 확인하고, [화분 선택하기]로 정원에서 오늘 기록할 화분을 골라요.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-dashboard-stats', text: '📊 누적 TIL 개수, 연속 기록일수, 전체 글자 수, 보유 포인트를 보여줘요.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-dashboard-grass', text: '🌱 TIL을 작성하면 잔디가 채워져요. 많이 기록한 날일수록 더 진한 색으로 표시돼요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-goals', text: '🎯 매일 주어지는 목표를 확인하고, 완료한 목표만큼 포인트를 받을 수 있어요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-streak', text: '🔥 최근 30일 작성량과 현재/최고 연속 기록을 함께 확인할 수 있어요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-distribution', text: '📊 가꾸고 있는 여러 화분(주제) 중 어떤 분야를 가장 많이 공부했는지 비율로 보여줘요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-weekly', text: '📅 이번 주 요일별로 글을 작성한 횟수를 그래프로 보여줘요. 주간 학습 패턴을 확인할 수 있어요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-dashboard-interests', text: '📈 시간의 흐름에 따라 나의 학습 관심사가 어떻게 변화했는지 보여줘요.', placement: 'top', textOffset: { x: -80, y: -30 } }
  ],
  garden: [
    { selector: '.guide-garden-scene', text: '🌿 매일 작성한 TIL로 키워낸 식물들을 정원에서 한눈에 볼 수 있어요.', placement: 'top', textOffset: { x: -120, y: -35 } },
    { selector: '.guide-garden-pots', text: '🪴 키우는 화분의 레벨과 물주기 상태를 확인하고, 수확한 식물로 화분 위를 꾸밀 수 있어요.', placement: 'top', textOffset: { x: 120, y: -20 } },
    { selector: '.guide-garden-edit', text: '🎨 [정원 꾸미기] 버튼을 누르면 화분 위치와 테마를 바꿀 수 있는 꾸미기 모드가 켜져요.', placement: 'bottom', textOffset: { x: -50, y: 15 } },
    { selector: '.guide-garden-scene', action: 'enableGardenEditMode', text: '🖐️ 꾸미기 모드에서 화분을 클릭한 채 원하는 위치로 끌어다 놓을 수 있어요.', placement: 'top', textOffset: { x: -120, y: -35 } },
    { selector: '.guide-garden-theme', action: 'enableGardenEditMode', text: '🖼️ 풀밭, 노을, 달밤, 미니멀 중 원하는 테마를 골라 정원 배경을 바꿀 수 있어요.', placement: 'left', textOffset: { x: -30, y: 0 } },
    { selector: '.guide-garden-edit', action: 'enableGardenEditMode', text: '💾 [꾸미기 완료] 버튼을 누르면 화분 배치와 정원 꾸미기 변경사항이 저장돼요.', placement: 'bottom', textOffset: { x: -50, y: 15 } }
  ],
  'pot-detail': [
    { selector: '.guide-pot-detail-plant', text: '🌱 현재 화분에서 자라는 식물의 모습을 볼 수 있어요. TIL을 작성하면 경험치가 쌓이고 성장 단계가 올라가요.', placement: 'right', textOffset: { x: 40, y: -20 } },
    { selector: '.guide-pot-detail-info', text: '🪴 화분 이름, 레벨, 소개글을 한눈에 볼 수 있어요. [화분 수정]으로 제목과 소개글을 바꿀 수 있어요.', placement: 'right', textOffset: { x: 40, y: 0 } },
    { selector: '.guide-pot-detail-growth', text: '📈 화분 경험치와 식물 상태, 수확 가능 여부를 확인할 수 있어요. 발행한 TIL이 물주기로 반영되면 성장 수치가 올라가요.', placement: 'right', textOffset: { x: 40, y: 0 } },
    { selector: '.guide-pot-detail-actions', text: '✍️ [TIL 작성하고 물주기]로 이 화분에 새 기록을 남길 수 있어요. [수확] 버튼으로 현재 식물을 수확할 수 있어요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-pot-detail-evolution', text: '🌿 진화 계통에서 현재 식물 단계와 앞으로 성장할 단계를 미리 볼 수 있어요.', placement: 'right', textOffset: { x: 40, y: 0 } },
    { selector: '.guide-pot-detail-records', text: '📚 이 화분에 작성한 TIL 목록이에요. 제목, 본문, 태그 검색으로 필요한 기록을 빠르게 찾을 수 있어요.', placement: 'left', textOffset: { x: -50, y: 0 } }
  ],
  editor: [
    { selector: '.guide-editor-pot-select', text: '🪴 오늘 기록을 쌓을 화분을 선택해요. 발행한 TIL은 선택한 화분의 경험치와 식물 성장에 반영돼요.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-editor-title', text: '✏️ 오늘 공부한 내용을 한눈에 알아볼 수 있도록 TIL 제목을 입력해요.', placement: 'right', textOffset: { x: 80, y: -10 } },
    { selector: '.guide-editor-tags', text: '🏷️ 태그를 달아두면 화분 상세, 대시보드, AI 학습에서 기록을 더 쉽게 찾을 수 있어요.', placement: 'right', textOffset: { x: 80, y: 0 } },
    { selector: '.guide-editor-toolbar', text: '🧰 글자 굵기, 이미지 업로드, 수학 공식 같은 서식을 적용할 수 있어요.', placement: 'bottom', textOffset: { x: -160, y: 15 } },
    { selector: '.guide-editor-content', text: '📄 오늘 학습한 내용을 자유롭게 작성하는 본문 영역이에요. 마크다운 단축키도 활용할 수 있어요.', placement: 'right', textOffset: { x: 80, y: -30 } },
    { selector: '.guide-editor-plant-status', text: '🌱 오른쪽 패널에서 현재 키우는 식물과 이번 글로 얻을 예상 경험치를 확인할 수 있어요.', placement: 'left', textOffset: { x: -50, y: 0 } },
    { selector: '.guide-editor-history', text: '📚 선택한 화분의 최근 TIL과 임시저장 글을 볼 수 있어요. 임시저장 글은 이어서 작성할 수 있어요.', placement: 'left', textOffset: { x: -50, y: 0 } },
    { selector: '.guide-editor-status', text: '✅ 하단 바에서 템플릿을 불러오거나 임시저장 상태를 확인해요. 최종 발행하면 선택한 화분에 물주기와 경험치가 반영돼요.', placement: 'top', textOffset: { x: 0, y: -25 } }
  ],
  ai: [
    { selector: '.guide-ai-mode', text: '🎯 AI 학습 목적을 선택해요. 복습 문제를 만들거나 TIL 내용을 요약해 핵심 개념을 정리할 수 있어요.', placement: 'bottom', textOffset: { x: 0, y: 15 } },
    { selector: '.guide-ai-quiz-count', action: 'ensureQuizMode', text: '🔢 복습 문제를 만들 때는 원하는 문제 수량을 고를 수 있어요. 문제 수에 따라 필요한 포인트가 달라져요.', placement: 'bottom', textOffset: { x: 0, y: 12 } },
    { selector: '.guide-ai-pots', text: '🪴 AI가 학습할 기준 화분을 선택해요. 해당 화분의 글을 바탕으로 학습지가 만들어져요.', placement: 'right', textOffset: { x: 40, y: -20 } },
    { selector: '.guide-ai-select-til', text: '📚 버튼을 누르면 학습에 활용할 TIL 글을 직접 고를 수 있어요.', placement: 'bottom', textOffset: { x: 0, y: 10 } },
    { selector: '.guide-ai-modal-list', action: 'openAiTilModal', text: '🔎 학습 데이터로 사용할 TIL 글을 골라요. 검색이나 태그 필터로 원하는 기록만 빠르게 찾을 수 있어요.', placement: 'left', textOffset: { x: -60, y: 0 } },
    { selector: '.guide-ai-modal-submit', action: 'openAiTilModal', text: '✨ 하단의 생성 버튼으로 선택한 TIL 기반 AI 학습지를 만들어요. 모드에 따라 포인트가 차감돼요.', placement: 'top', textOffset: { x: 0, y: -20 } },
    { selector: '.guide-ai-result', action: 'showAiGuideResult', text: '🧠 AI가 만든 퀴즈를 풀고 채점하거나, 요약된 개념 노트를 학습할 수 있어요.', placement: 'left', textOffset: { x: -40, y: 0 } },
    { selector: '.guide-ai-saved-results', text: '🗂️ 저장한 AI 결과는 보관함에 모여요. 나중에 다시 열어 복습할 수 있어요.', placement: 'right', textOffset: { x: 40, y: 0 } }
  ]
};

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
  const [leftFreedWidth, setLeftFreedWidth] = useState(0);
  const rightFreedWidth = rightOpen ? 0 : 266;
  const [guideOpen, setGuideOpen] = useState(false);

  const toggleRightPanel = () => setRightOpen((o) => {
    const next = !o;
    try { localStorage.setItem('rootin.tilRightOpen', String(next)); } catch { }
    return next;
  });
  const toggleFocusMode = () => setFocusMode((f) => !f);
  const screen = getScreenFromPath(location.pathname);
  const routePotId = getPotIdFromPath(location.pathname);
  const editorQueryPotId = getEditorPotIdFromSearch(location.search);
  const editorEntryMode = getEditorModeFromSearch(location.search);
  const activeEditorPotId = editorQueryPotId ?? editorInitialPotId;
  const guideStorageKey = GUIDE_STEPS[screen] ? `rootin.visitedGuide.${screen}` : null;

  const closeGuide = useCallback(() => {
    if (guideStorageKey) {
      try { localStorage.setItem(guideStorageKey, 'true'); } catch { }
    }
    setGuideOpen(false);
  }, [guideStorageKey]);

  useEffect(() => {
    if (authed && guideStorageKey) {
      const hasVisited = localStorage.getItem(guideStorageKey);
      if (!hasVisited) {
        const timer = setTimeout(() => {
          setGuideOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [authed, guideStorageKey]);

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
      navigate('/editor?mode=new');
      return;
    }
    navigate(screenToPath(nextScreen, potFocus));
  };

  const openEditorForPot = (potId) => {
    setPotFocus(potId);
    setEditorInitialPotId(potId);
    setEditorInitialTil(null);
    setEditorReturnScreen(`/garden/pots/${potId}`);
    navigate(`/editor?potId=${potId}&mode=new`);
  };

  const openEditorForTil = (til) => {
    const returnPotId = til?.potId ?? potFocus ?? routePotId;
    setEditorInitialPotId(returnPotId ?? null);
    setEditorInitialTil(til);
    setEditorReturnScreen(returnPotId ? `/garden/pots/${returnPotId}` : '/garden');
    navigate(returnPotId ? `/editor?potId=${returnPotId}` : '/editor');
  };

  const resumeEditorDraft = (potId) => {
    setEditorInitialPotId(potId ?? null);
    setEditorInitialTil(null);
    navigate(potId ? `/editor?potId=${potId}&mode=resume` : '/editor?mode=resume', { replace: true });
  };

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
          onCollapseChange={setLeftFreedWidth}
        />
        <SidebarInset style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 0, margin: 0, background: 'transparent' }}>
          <div className="scrollbar" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardScreen onNav={handleNav} />} />
              <Route path="/editor" element={(
                <EditorScreen
                  onNav={handleNav}
                  initialSelectedPotId={activeEditorPotId}
                  entryMode={editorEntryMode}
                  initialTil={editorInitialTil}
                  afterPublishScreen={editorReturnScreen ?? (activeEditorPotId ? `/garden/pots/${activeEditorPotId}` : '/dashboard')}
                  onPublished={handleTilPublished}
                  onSelectedPotChange={syncEditorPotQuery}
                  focusMode={focusMode}
                  onToggleFocus={toggleFocusMode}
                  contentShift={leftFreedWidth}
                  rightContentShift={rightFreedWidth}
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
        {guideOpen && GUIDE_STEPS[screen] && (
          <GuideOverlay
            isOpen={guideOpen}
            onClose={closeGuide}
            steps={GUIDE_STEPS[screen]}
          />
        )}
        {GUIDE_STEPS[screen] && !focusMode && (
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center justify-center border hover:bg-muted text-muted-foreground transition-all duration-200"
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '24px',
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
            title="이 화면의 이용 가이드 맵 켜기"
          >
            ?
          </button>
        )}
      </SidebarProvider>
      {logoutModalOpen && (
        <LogoutConfirmModal
          onConfirm={async () => {
            try {
              await logout().catch(() => { });
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

function getEditorModeFromSearch(search) {
  const mode = new URLSearchParams(search).get('mode');
  return mode === 'new' || mode === 'resume' ? mode : null;
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
