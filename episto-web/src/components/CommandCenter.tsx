import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  ClipboardCheck,
  Database,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import { useAppStore } from '../store'
import type { ReviewTask } from '../store'

// ============================================================
// Review Task Card
// ============================================================

function ReviewCard({ task }: { task: ReviewTask }) {
  const navigate = useNavigate()
  const toggleTutorPanel = useAppStore((s) => s.toggleTutorPanel)
  const tutorPanelOpen = useAppStore((s) => s.tutorPanelOpen)

  const handleClick = () => {
    if (!tutorPanelOpen) toggleTutorPanel()
    navigate('/tutor')
  }

  return (
    <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] dark:bg-[#3D350A] flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-[#92400E] dark:text-[#FCD34D]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-[#92400E] dark:text-[#FCD34D] uppercase tracking-wide">
              Tutor 提醒
            </span>
            <span className="text-[10px] text-[#a39e98] dark:text-[#6B6B6B]">{task.dueLabel}</span>
          </div>
          <p className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] leading-[1.6] mb-3">
            根据艾宾浩斯遗忘曲线，你今天需要复习：<strong>{task.concept}</strong>
          </p>
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#FEF9C3] dark:bg-[#3D350A] text-[#92400E] dark:text-[#FCD34D] hover:bg-[#FEF08A] dark:hover:bg-[#4A3F0F] transition-colors"
          >
            {task.action}
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Wrong Question Alert Card
// ============================================================

function WrongQuestionCard() {
  const alert = useAppStore((s) => s.wrongQuestionAlert)
  const navigate = useNavigate()

  return (
    <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[#1E2A3A] flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-4 h-4 text-[#0075de] dark:text-[#4DA3E8]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-[#0075de] dark:text-[#4DA3E8] uppercase tracking-wide">
              Examiner 提醒
            </span>
          </div>
          <p className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] leading-[1.6] mb-3">
            你在「<strong>{alert.knowledgePoint}</strong>」积累了 <strong>{alert.count}</strong> 道高频错题，已生成动态巩固卷。
          </p>
          <button
            onClick={() => navigate('/assessments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#0075de] dark:bg-[#4DA3E8] text-white hover:bg-[#0064c2] dark:hover:bg-[#3B8FD4] transition-colors"
          >
            一键开始重测
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Knowledge Base Stats
// ============================================================

function KBStatsCard() {
  const stats = useAppStore((s) => s.kbStats)

  return (
    <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] dark:bg-[#14352A] flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[#059669] dark:text-[#34D399] uppercase tracking-wide">
              Ingestor 汇报
            </span>
            <span className="text-[10px] text-[#a39e98] dark:text-[#6B6B6B]">{stats.lastIngest}</span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[20px] font-semibold text-[#37352F] dark:text-[#D3D3D3] tabular-nums">
                {stats.totalDocs}
              </p>
              <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">已向量化文档</p>
            </div>
            <div className="w-px h-8 bg-[#E9E9E7] dark:bg-[#2A2A2A]" />
            <div>
              <p className="text-[20px] font-semibold text-[#37352F] dark:text-[#D3D3D3] tabular-nums">
                {stats.totalSlices}
              </p>
              <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">知识切片</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Lead Status Card
// ============================================================

function LeadStatusCard() {
  const backendOnline = useAppStore((s) => s.backendOnline)
  const online = backendOnline

  return (
    <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F7F7F5] dark:bg-[#2A2A2A] flex items-center justify-center shrink-0">
          <Brain className="w-4 h-4 text-[#787774] dark:text-[#9B9B9B]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[#787774] dark:text-[#9B9B9B] uppercase tracking-wide">
              Lead Agent
            </span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
              online
                ? 'bg-[#F0FDF4] dark:bg-[#14352A] text-[#059669] dark:text-[#34D399]'
                : 'bg-[#FEF2F2] dark:bg-[#3A1E1E] text-[#DC2626] dark:text-[#F87171]'
            }`}>
              <span className={`w-1 h-1 rounded-full ${online ? 'bg-[#059669] dark:bg-[#34D399]' : 'bg-[#DC2626] dark:bg-[#F87171]'}`} />
              {online ? '在线' : '离线'}
            </span>
          </div>
          <p className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] leading-[1.6]">
            {online
              ? '调度中枢就绪。Tutor、Examiner、Ingestor 均处于待命状态，随时响应你的指令。'
              : '后端服务未启动，请确认 Python 服务已运行（uvicorn episto.main:app --reload）。'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// CommandCenter — Dashboard Home
// ============================================================

export default function CommandCenter() {
  const reviewTasks = useAppStore((s) => s.reviewTasks)
  const fetchDashboardData = useAppStore((s) => s.fetchDashboardData)
  const checkBackendHealth = useAppStore((s) => s.checkBackendHealth)

  useEffect(() => {
    checkBackendHealth()
    fetchDashboardData()
  }, [checkBackendHealth, fetchDashboardData])

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-8">
      <div className="w-full max-w-3xl">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0075de] to-[#4DA3E8] flex items-center justify-center shadow-lg shadow-[#0075de]/20">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[22px] font-bold text-[#37352F] dark:text-[#D3D3D3] tracking-tight">
              Episto 指挥中心
            </h1>
          </div>
          <p className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B]">
            Multi-Agent 协作系统 — 你的 24/7 私人教研团队
          </p>
        </div>

        {/* Proactive Tasks */}
        <div className="mb-6">
          <h2 className="text-[12px] font-semibold text-[#a39e98] dark:text-[#6B6B6B] uppercase tracking-wide mb-3 px-1">
            晨间简报
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewTasks.map((task) => (
              <ReviewCard key={task.id} task={task} />
            ))}
            <WrongQuestionCard />
          </div>
        </div>

        {/* Knowledge Base & Lead */}
        <div>
          <h2 className="text-[12px] font-semibold text-[#a39e98] dark:text-[#6B6B6B] uppercase tracking-wide mb-3 px-1">
            系统状态
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KBStatsCard />
            <LeadStatusCard />
          </div>
        </div>
      </div>
    </div>
  )
}
