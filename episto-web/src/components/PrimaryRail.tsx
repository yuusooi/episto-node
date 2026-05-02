import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Vault, ClipboardCheck, GraduationCap, Sun, Moon, PanelLeftClose, PanelLeft, MessageSquare, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '../store'

const RAIL_ITEMS = [
  { path: '/vault', icon: Vault, label: '文档金库' },
  { path: '/assessments', icon: ClipboardCheck, label: '动态评测室' },
  { path: '/tutor', icon: GraduationCap, label: '私教专区' },
] as const

export default function PrimaryRail() {
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const isDark = useAppStore((s) => s.isDark)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const tutorPanelOpen = useAppStore((s) => s.tutorPanelOpen)
  const toggleTutorPanel = useAppStore((s) => s.toggleTutorPanel)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)

  const isOnCommandCenter = location.pathname === '/vault' && !activeFileId

  const goToCommandCenter = () => {
    setActiveFileId(null)
    navigate('/vault')
  }

  return (
    <div className="w-[64px] h-screen flex flex-col items-center bg-[#F7F7F5] dark:bg-[#1C1C1C] shrink-0 py-3">
      {/* Logo mark */}
      <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#2A2A2A] shadow-sm dark:shadow-none flex items-center justify-center mb-6">
        <span className="text-[14px] font-bold text-[#37352F] dark:text-[#D3D3D3]">E</span>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {/* Command Center button */}
        <button
          onClick={goToCommandCenter}
          title="指挥中心"
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
            isOnCommandCenter
              ? 'bg-white dark:bg-[#2A2A2A] shadow-sm dark:shadow-none text-[#37352F] dark:text-[#D3D3D3]'
              : 'text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B]'
          }`}
        >
          <LayoutDashboard className="w-[20px] h-[20px]" strokeWidth={isOnCommandCenter ? 2 : 1.5} />
        </button>

        {/* Divider */}
        <div className="w-6 h-px bg-[#E9E9E7] dark:bg-[#3A3A3A] my-1" />

        {RAIL_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              title={label}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
                isActive
                  ? 'bg-white dark:bg-[#2A2A2A] shadow-sm dark:shadow-none text-[#37352F] dark:text-[#D3D3D3]'
                  : 'text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B]'
              }`}
            >
              <Icon className="w-[20px] h-[20px]" strokeWidth={isActive ? 2 : 1.5} />
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={toggleTutorPanel}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            tutorPanelOpen
              ? 'bg-white dark:bg-[#2A2A2A] shadow-sm dark:shadow-none text-[#0075de] dark:text-[#4DA3E8]'
              : 'text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B]'
          }`}
          title={tutorPanelOpen ? '关闭 Tutor' : '打开 Tutor'}
        >
          <MessageSquare className="w-[18px] h-[18px]" strokeWidth={tutorPanelOpen ? 2 : 1.5} />
        </button>
        <button
          onClick={toggleSidebar}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B] transition-colors"
          title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          {sidebarCollapsed
            ? <PanelLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
            : <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} />
          }
        </button>
        <button
          onClick={toggleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#787774] dark:hover:text-[#9B9B9B] transition-colors"
          title="切换主题"
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  )
}
