import { Brain, GraduationCap, ClipboardCheck, Database } from 'lucide-react'
import { useAppStore } from '../store'
import type { AgentRole } from '../types'
import { useEffect, useState } from 'react'

const AGENT_CONFIG: Record<AgentRole, {
  icon: typeof Brain
  label: string
  color: string
  bgActive: string
  bgIdle: string
}> = {
  lead: {
    icon: Brain,
    label: 'Lead',
    color: 'text-[#787774] dark:text-[#9B9B9B]',
    bgActive: 'bg-[#F7F7F5] dark:bg-[#2A2A2A]',
    bgIdle: 'bg-transparent',
  },
  tutor: {
    icon: GraduationCap,
    label: 'Tutor',
    color: 'text-[#92400E] dark:text-[#FCD34D]',
    bgActive: 'bg-[#FEF9C3] dark:bg-[#3D350A]',
    bgIdle: 'bg-transparent',
  },
  examiner: {
    icon: ClipboardCheck,
    label: 'Examiner',
    color: 'text-[#0075de] dark:text-[#4DA3E8]',
    bgActive: 'bg-[#EFF6FF] dark:bg-[#1E2A3A]',
    bgIdle: 'bg-transparent',
  },
  ingestor: {
    icon: Database,
    label: 'Ingestor',
    color: 'text-[#059669] dark:text-[#34D399]',
    bgActive: 'bg-[#F0FDF4] dark:bg-[#14352A]',
    bgIdle: 'bg-transparent',
  },
}

const AGENT_ORDER: AgentRole[] = ['lead', 'tutor', 'examiner', 'ingestor']

function AgentBadge({
  role,
  active,
  label,
}: {
  role: AgentRole
  active: boolean
  label?: string
}) {
  const cfg = AGENT_CONFIG[role]
  const Icon = cfg.icon

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-500 ${
        active ? `${cfg.bgActive} ${cfg.color}` : `${cfg.bgIdle} text-[#c4c4c0] dark:text-[#4A4A4A]`
      }`}
    >
      <Icon className={`w-3 h-3 ${active ? cfg.color : ''}`} />
      <span>{cfg.label}</span>
      {active && label && (
        <span className="text-[10px] opacity-60 ml-0.5">{label}</span>
      )}
      {active && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${role === 'tutor' ? 'bg-[#92400E] dark:bg-[#FCD34D]' : role === 'examiner' ? 'bg-[#0075de] dark:bg-[#4DA3E8]' : role === 'ingestor' ? 'bg-[#059669] dark:bg-[#34D399]' : 'bg-[#787774] dark:bg-[#9B9B9B]'}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${role === 'tutor' ? 'bg-[#92400E] dark:bg-[#FCD34D]' : role === 'examiner' ? 'bg-[#0075de] dark:bg-[#4DA3E8]' : role === 'ingestor' ? 'bg-[#059669] dark:bg-[#34D399]' : 'bg-[#787774] dark:bg-[#9B9B9B]'}`} />
        </span>
      )}
    </div>
  )
}

export default function AgentActivityBar() {
  const agentStream = useAppStore((s) => s.agentStream)
  const [latest, setLatest] = useState<{ agent: AgentRole | null; label: string } | null>(null)

  useEffect(() => {
    if (agentStream.length > 0) {
      const last = agentStream[agentStream.length - 1]
      if (last.activeAgent) {
        setLatest({ agent: last.activeAgent, label: last.label })
      }
    } else {
      setLatest(null)
    }
  }, [agentStream])

  return (
    <div className="flex items-center gap-1.5">
      {AGENT_ORDER.map((role) => (
        <AgentBadge
          key={role}
          role={role}
          active={latest != null && latest.agent === role}
          label={latest != null && latest.agent === role ? latest.label : undefined}
        />
      ))}
    </div>
  )
}
