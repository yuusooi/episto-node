import { useLocation } from 'react-router-dom'
import { useAppStore } from '../store'
import AgentActivityBar from './AgentActivityBar'
import type { AgentStatus } from '../types'

const PAGE_TITLES: Record<string, string> = {
  '/vault': '文档金库',
  '/assessments': '动态评测室',
  '/tutor': '私教专区',
}

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; pulse: boolean }> = {
  idle: { label: '待命', color: 'bg-[#c4c4c0] dark:bg-[#4A4A4A]', pulse: false },
  thinking: { label: '思考中', color: 'bg-[#d97757] dark:bg-[#D97757]', pulse: true },
  generating_exam: { label: '组卷中', color: 'bg-[#0075de] dark:bg-[#4DA3E8]', pulse: true },
  grading: { label: '批改中', color: 'bg-[#9b59b6] dark:bg-[#9B59B6]', pulse: true },
}

export default function Header() {
  const location = useLocation()
  const agentStatus = useAppStore((s) => s.agentStatus)
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'episto-node'
  const statusCfg = STATUS_CONFIG[agentStatus]

  return (
    <header className="h-12 flex items-center justify-between px-6 shrink-0 border-b border-[#E9E9E7] dark:border-[#2A2A2A]">
      <div className="flex items-center gap-4">
        <span className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] font-medium">{pageTitle}</span>
        <AgentActivityBar />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative flex items-center justify-center">
          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.color}`} />
          {statusCfg.pulse && (
            <div className={`absolute w-1.5 h-1.5 rounded-full ${statusCfg.color} animate-ping opacity-60`} />
          )}
        </div>
        <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] font-medium tabular-nums">
          {statusCfg.label}
        </span>
      </div>
    </header>
  )
}
