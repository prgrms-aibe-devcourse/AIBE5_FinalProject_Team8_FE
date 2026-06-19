import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext.jsx';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { GameBoySidebar } from '@/components/GameBoySidebar.jsx';
import { RootinSidebarLeft } from '@/components/RootinSidebarLeft.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { TilEditorProvider as TilEditorProviderClassic } from '@/components/til-classic/til-editor-context';
import { TilEditorProvider } from '@/components/til/til-editor-context';
import { logout, clearTokens } from './api/auth.js';
import { useSmoothScroll } from './hooks/useSmoothScroll.js';
import { NotFoundScreen } from './screens-error.jsx';

// App shell — sidebar + topbar + route-based screen routing

// Old custom Sidebar and TopBar removed and replaced by Shadcn UI

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const DashboardScreen = lazyNamed(() => import('./screens-dashboard.jsx'), 'DashboardScreen');
const EditorScreen = lazyNamed(() => import('./screens-editor.jsx'), 'EditorScreen');
const GardenScreen = lazyNamed(() => import('./screens-garden.jsx'), 'GardenScreen');
const PotDetailScreen = lazyNamed(() => import('./screens-garden.jsx'), 'PotDetailScreen');
const TilDetailScreen = lazyNamed(() => import('./screens-garden.jsx'), 'TilDetailScreen');
const RootinSidebarRight = lazyNamed(() => import('./components/RootinSidebarRight.jsx'), 'RootinSidebarRight');
const CollectionScreen = lazyNamed(() => import('./screens-rest.jsx'), 'CollectionScreen');
const AIScreen = lazyNamed(() => import('./screens-rest.jsx'), 'AIScreen');
const ProfileScreen = lazyNamed(() => import('./screens-rest.jsx'), 'ProfileScreen');
const AuthScreen = lazyNamed(() => import('./screens-rest.jsx'), 'AuthScreen');
const LandingScreen = lazyNamed(() => import('./screens-landing.jsx'), 'LandingScreen');

const DashboardClassic = lazyNamed(() => import('./screens-dashboard.classic.jsx'), 'DashboardScreen');
const EditorClassic = lazyNamed(() => import('./screens-editor.classic.jsx'), 'EditorScreen');
const GardenClassic = lazyNamed(() => import('./screens-garden.classic.jsx'), 'GardenScreen');
const PotDetailClassic = lazyNamed(() => import('./screens-garden.classic.jsx'), 'PotDetailScreen');
const RootinSidebarRightClassic = lazyNamed(() => import('./components/RootinSidebarRight.classic.jsx'), 'RootinSidebarRight');
const CollectionClassic = lazyNamed(() => import('./screens-rest.classic.jsx'), 'CollectionScreen');
const AIClassic = lazyNamed(() => import('./screens-rest.classic.jsx'), 'AIScreen');
const ProfileClassic = lazyNamed(() => import('./screens-rest.classic.jsx'), 'ProfileScreen');
const GuideOverlay = lazyNamed(() => import('./components/GuideOverlay.jsx'), 'GuideOverlay');
const LogoutConfirmModal = lazyNamed(() => import('./components/LogoutConfirmModal.jsx'), 'LogoutConfirmModal');
const LogoutConfirmModalClassic = lazyNamed(() => import('./components/LogoutConfirmModal.classic.jsx'), 'LogoutConfirmModal');

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-2)',
        background: 'var(--paper)',
        fontSize: 14,
      }}
    >
      화면을 불러오고 있어요.
    </div>
  );
}

// 사용자 이용 가이드 단계 정의 — 화면 요소를 .guide-* 클래스로 가리키며 안내한다.
// classic·gameboy 두 테마 모두 동일한 .guide-* 타겟을 두므로 같은 단계 정의를 공유한다.
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
    { selector: '.guide-ai-saved-results', text: '🗂️ 저장한 AI 결과는 보관함에 모여요. 나중에 다시 열어 복습할 수 있어요.', placement: 'top', textOffset: { x: 0, y: -20 } }
  ]
};

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
  // 좌측 사이드바 열림 상태는 SidebarProvider가 토글 시 기록하는 sidebar_state 쿠키에서 복원한다(새로고침 후에도 유지).
  const [leftOpen, setLeftOpen] = useState(() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);
      return m ? m[1] === 'true' : true;
    } catch { return true; }
  });
  const [rightOpen, setRightOpen] = useState(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('rootin.tilRightOpen') : null;
    return v === null ? true : v === 'true';
  });
  const [focusMode, setFocusMode] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // 부드러운 스크롤 — 인증 앱과 랜딩·로그인 모두 실제 스크롤 주체는 window 다.
  // (SidebarProvider 가 height 고정이 아니라 minHeight:100vh 라 .scrollbar 는 콘텐츠만큼 자라며
  //  스크롤은 window 에서 일어난다. 에디터처럼 자체 스크롤러를 가진 화면은 allowNestedScroll 로 보존)
  // 라우트 전환마다 재생성해 Lenis 의 내부 타깃을 현재 스크롤 위치로 깨끗하게 맞춘다.
  useSmoothScroll({ enabled: true, resetKey: location.pathname });

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
  const routePotId = getPotIdFromPath(location.pathname);
  const editorQueryPotId = getEditorPotIdFromSearch(location.search);
  const activeEditorPotId = editorQueryPotId ?? editorInitialPotId;
  // 이용 가이드는 두 테마 모두에서 동작한다. 각 테마 화면이 동일한 .guide-* 타겟을 갖고,
  // GuideOverlay는 theme prop으로 카드/스포트라이트 룩만 분기한다(positioning 로직은 공통).
  const guideEnabled = !!GUIDE_STEPS[screen];
  const guideStorageKey = guideEnabled ? `rootin.visitedGuide.${screen}` : null;

  const closeGuide = useCallback(() => {
    if (guideStorageKey) {
      try { localStorage.setItem(guideStorageKey, 'true'); } catch { /* noop */ }
    }
    setGuideOpen(false);
  }, [guideStorageKey]);

  // 화면 첫 방문 시(메인 테마) 이용 가이드를 1초 뒤 한 번 자동으로 열어준다. (방문 기록은 localStorage)
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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
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
          <Suspense fallback={<RouteFallback />}>
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
              <Route path="/ai" element={theme === 'classic' ? <AIClassic onOpenGuide={() => setGuideOpen(true)} /> : <AIScreen />} />
              <Route path="/profile" element={theme === 'classic' ? <ProfileClassic /> : <ProfileScreen />} />
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
          </Suspense>
        </div>
      </SidebarInset>
      {screen === 'editor' && !focusMode && (
        <Suspense fallback={null}>
          <RightPanel
            onEditTil={openEditorForTil}
            onResumeDraft={resumeEditorDraft}
            onNewTil={startNewEditorTil}
            open={rightOpen}
            onToggle={toggleRightPanel}
          />
        </Suspense>
      )}
      {/* 모니터 베젤 — 대시보드/정원/도감 등 framed 화면에서만 표시한다. */}
      {framed && (
        <div
          className="rt-vision-frame"
          aria-hidden="true"
        >
          <span className="vf-label">ROOTIN VISION-DISPLAY · 16:9 DOT MATRIX</span>
          <div className="vf-brand">
            <span className="vf-led" /><span>POWER</span>
            <span className="vf-word">Rootin</span>
            <span>DOT-MATRIX VISION DISPLAY™ · MODEL RT-9</span>
          </div>
          <div className="vf-grille"><i /><i /><i /><i /><i /><span className="vf-knob" /></div>
        </div>
      )}
      {guideEnabled && guideOpen && (
        <Suspense fallback={null}>
          <GuideOverlay
            isOpen={guideOpen}
            onClose={closeGuide}
            steps={GUIDE_STEPS[screen]}
            theme={isClassic ? 'classic' : 'gameboy'}
          />
        </Suspense>
      )}
      {guideEnabled && !focusMode && (
        <button
          onClick={() => setGuideOpen(true)}
          className="flex items-center justify-center transition-all duration-200"
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            zIndex: 100,
            width: isClassic ? 32 : 38,
            height: isClassic ? 32 : 38,
            border: isClassic ? '1px solid var(--rule-2)' : '2px solid #33402a',
            borderRadius: isClassic ? '50%' : '8px',
            backgroundColor: isClassic ? 'var(--paper)' : '#f8f2e3',
            color: isClassic ? 'var(--ink-2)' : '#33402a',
            fontFamily: isClassic ? 'inherit' : '"Galmuri11", "DungGeunMo", monospace',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: isClassic ? '0 2px 8px rgba(0,0,0,0.1)' : '3px 3px 0 0 #33402a',
          }}
          title="이 화면의 이용 가이드 맵 켜기"
        >
          ?
        </button>
      )}
    </SidebarProvider>
    {logoutModalOpen && (
      <Suspense fallback={null}>
        {theme === 'classic'
          ? <LogoutConfirmModalClassic onConfirm={confirmLogout} onClose={closeLogoutModal} />
          : <LogoutConfirmModal onConfirm={confirmLogout} onClose={closeLogoutModal} />}
      </Suspense>
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
