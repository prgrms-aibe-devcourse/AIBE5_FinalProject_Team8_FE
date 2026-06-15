import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import { Icon } from '../ui.jsx';
import { Plant, RootinLogo } from '../plants.jsx';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { NavMain } from '@/components/nav-main';

export function RootinSidebarLeft({ current, onNav, onLogout, ...props }) {
  const { user } = useUser();
  const navigate = useNavigate();

  const navMainItems = [
    { title: '대시보드', icon: Icon.home, isActive: current === 'dashboard', onClick: () => onNav('dashboard') },
    { title: '정원', icon: Icon.garden, isActive: current === 'garden', onClick: () => onNav('garden') },
    { title: '식물도감', icon: Icon.book, isActive: current === 'collection', onClick: () => onNav('collection') },
    { title: 'AI 학습', icon: Icon.sparkles, isActive: current === 'ai', onClick: () => onNav('ai') },
    { title: '프로필', icon: Icon.user, isActive: current === 'profile', onClick: () => onNav('profile') },
  ];

  return (
    <Sidebar className="border-r-0 rootin-sidebar-left" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer" onClick={() => user ? onNav('dashboard') : navigate('/')}>
              <div className="rootin-badge-moss flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <RootinLogo size={20} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="rootin-brand truncate font-semibold">Rootin</span>
                <span className="rootin-slogan truncate text-xs">매일의 학습이 자라는 곳</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 mt-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="rootin-badge-amber flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Plant stage="leaf" size={20} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">연속 {user?.streak ?? 0}일 달성 중</span>
                <span className="truncate text-xs">최고 기록 {user?.bestStreak ?? 0}일</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="rootin-logout-btn" onClick={onLogout}>
              <div style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
