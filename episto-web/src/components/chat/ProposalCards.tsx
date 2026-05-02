import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Brain,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Circle,
  Download,
  Rocket,
  MessageSquare,
  Play,
  Sliders,
} from 'lucide-react'
import { useAppStore } from '../../store'
import type {
  ProposalData,
  ExaminerProposalPayload,
  TutorReviewPayload,
  TutorLearningPayload,
  TransitionPayload,
} from '../../types'

// ============================================================
// Shared card shell
// ============================================================

function CardShell({
  icon,
  iconBg,
  title,
  children,
  actions,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  children: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 flex items-center gap-2 ${iconBg}`}>
        {icon}
        <span className="text-[13px] font-semibold text-[#37352F] dark:text-[#E8E8E8]">{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
      <div className="px-4 py-2.5 border-t border-[#E9E9E7] dark:border-[#2A2A2A] flex items-center gap-2 flex-wrap">
        {actions}
      </div>
    </div>
  )
}

function ActionBtn({
  icon,
  label,
  primary,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
        primary
          ? 'bg-[#0075de] hover:bg-[#0064c2] text-white dark:bg-[#4DA3E8] dark:hover:bg-[#3B8FD4]'
          : 'bg-[#F7F7F5] hover:bg-[#EFEFED] text-[#37352F] dark:bg-[#2A2A2A] dark:hover:bg-[#333] dark:text-[#D3D3D3]'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// ============================================================
// Examiner Proposal — 出卷模式
// ============================================================

function ExaminerProposalCard({ proposal }: { proposal: ProposalData }) {
  const p = proposal.payload as unknown as ExaminerProposalPayload
  const navigate = useNavigate()
  const setExamData = useAppStore((s) => s.setExamData)
  const addFile = useAppStore((s) => s.addFile)
  const [mcCount, setMcCount] = useState(p.default_multiple_choice ?? 4)
  const [openCount, setOpenCount] = useState(p.default_open_ended ?? 1)
  const [difficulty, setDifficulty] = useState(p.default_difficulty ?? 'medium')

  const handleGoAssessments = () => {
    const exam = {
      title: p.suggested_title ?? `${p.knowledge_point} — 动态测验`,
      difficulty,
      knowledgePoint: p.knowledge_point,
      questions: Array.from({ length: mcCount }, (_, i) => ({
        question: `${p.knowledge_point} 相关问题 ${i + 1}`,
        options: ['选项 A', '选项 B', '选项 C', '选项 D'],
        answer: '选项 A',
        explanation: '由 Tutor Agent 生成的解析',
      })),
    }
    setExamData(exam)
    navigate('/assessments')
  }

  const handleSaveToVault = () => {
    const content = `# ${p.suggested_title ?? p.knowledge_point + ' 测验'}\n\n**难度**: ${difficulty}\n**知识点**: ${p.knowledge_point}\n\n---\n\n`
      + Array.from({ length: mcCount }, (_, i) => `${i + 1}. ${p.knowledge_point} 问题 ${i + 1}\n`).join('')
    addFile(null, `${p.suggested_title ?? '测验'}.md`, 'md', content)
  }

  return (
    <CardShell
      icon={<FileText className="w-4 h-4 text-[#0075de] dark:text-[#4DA3E8]" />}
      iconBg="bg-[#f2f9ff] dark:bg-[#1E2A3A]"
      title={proposal.title}
      actions={
        <>
          <ActionBtn icon={<Download className="w-3.5 h-3.5" />} label="存入文档金库" onClick={handleSaveToVault} />
          <ActionBtn icon={<Rocket className="w-3.5 h-3.5" />} label="立即前往评测室" primary onClick={handleGoAssessments} />
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          单选题
          <input type="number" min={1} max={20} value={mcCount} onChange={(e) => setMcCount(Number(e.target.value))}
            className="block w-full mt-0.5 px-2 py-1 rounded-md border border-[#E9E9E7] dark:border-[#2A2A2A] bg-transparent text-[13px] text-[#37352F] dark:text-[#D3D3D3] outline-none focus:border-[#0075de] dark:focus:border-[#4DA3E8]" />
        </label>
        <label className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          填空/问答
          <input type="number" min={0} max={10} value={openCount} onChange={(e) => setOpenCount(Number(e.target.value))}
            className="block w-full mt-0.5 px-2 py-1 rounded-md border border-[#E9E9E7] dark:border-[#2A2A2A] bg-transparent text-[13px] text-[#37352F] dark:text-[#D3D3D3] outline-none focus:border-[#0075de] dark:focus:border-[#4DA3E8]" />
        </label>
        <label className="text-[11px] text-[#787774] dark:text-[#9B9B9B]">
          难度
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="block w-full mt-0.5 px-2 py-1 rounded-md border border-[#E9E9E7] dark:border-[#2A2A2A] bg-transparent text-[13px] text-[#37352F] dark:text-[#D3D3D3] outline-none focus:border-[#0075de] dark:focus:border-[#4DA3E8]">
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </label>
      </div>
      <p className="mt-2 text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">知识点: {p.knowledge_point}</p>
    </CardShell>
  )
}

// ============================================================
// Tutor Review — 复习模式
// ============================================================

function TutorReviewCard({
  proposal,
  onChatAction,
}: {
  proposal: ProposalData
  onChatAction: (msg: string) => void
}) {
  const p = proposal.payload as unknown as TutorReviewPayload
  const [selected, setSelected] = useState<Set<string>>(new Set(p.topics?.map((t) => t.id) ?? []))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <CardShell
      icon={<Brain className="w-4 h-4 text-[#9333EA]" />}
      iconBg="bg-[#faf5ff] dark:bg-[#2D1B4E]"
      title={proposal.title}
      actions={
        <>
          <ActionBtn icon={<Sparkles className="w-3.5 h-3.5" />} label="开始首轮提问" primary onClick={() => onChatAction(`开始复习，已选择主题: ${Array.from(selected).join(', ')}`)} />
          <ActionBtn icon={<MessageSquare className="w-3.5 h-3.5" />} label="重新划定范围" onClick={() => onChatAction('重新划定复习范围')} />
        </>
      }
    >
      <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B] mb-2">{p.summary}</p>
      <div className="space-y-1">
        {p.topics?.map((topic) => (
          <label key={topic.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#F7F7F5] dark:hover:bg-[#2A2A2A] cursor-pointer" onClick={() => toggle(topic.id)}>
            {selected.has(topic.id) ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0075de] dark:text-[#4DA3E8]" /> : <Circle className="w-3.5 h-3.5 text-[#C4C4C4] dark:text-[#555]" />}
            <span className="text-[12px] text-[#37352F] dark:text-[#D3D3D3] flex-1">{topic.label}</span>
            <span className="text-[10px] text-[#a39e98] dark:text-[#6B6B6B]">{topic.file_count} 文件</span>
          </label>
        ))}
      </div>
    </CardShell>
  )
}

// ============================================================
// Tutor Learning — 学习路径
// ============================================================

function TutorLearningCard({
  proposal,
  onChatAction,
}: {
  proposal: ProposalData
  onChatAction: (msg: string) => void
}) {
  const p = proposal.payload as unknown as TutorLearningPayload
  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    if (status === 'in_progress') return <ChevronRight className="w-3.5 h-3.5 text-[#0075de] dark:text-[#4DA3E8]" />
    return <Circle className="w-3.5 h-3.5 text-[#C4C4C4] dark:text-[#555]" />
  }

  return (
    <CardShell
      icon={<BookOpen className="w-4 h-4 text-[#059669]" />}
      iconBg="bg-[#f0fdf4] dark:bg-[#14352A]"
      title={proposal.title}
      actions={
        <>
          <ActionBtn icon={<Play className="w-3.5 h-3.5" />} label="开始导读" primary onClick={() => onChatAction('开始导读')} />
          <ActionBtn icon={<Sliders className="w-3.5 h-3.5" />} label="调整学习深度" onClick={() => onChatAction('调整学习深度')} />
        </>
      }
    >
      <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B] mb-2">
        概念: <strong className="text-[#37352F] dark:text-[#E8E8E8]">{p.concept}</strong>
        {' '}&middot; 预计 {p.estimated_steps} 步
      </p>
      <div className="space-y-0">
        {p.prerequisites?.map((prereq, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            {statusIcon(prereq.status)}
            <span className="text-[12px] text-[#37352F] dark:text-[#D3D3D3]">{prereq.title}</span>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

// ============================================================
// Transition Card — Agent 联动移交
// ============================================================

function TransitionCardInner({
  proposal,
  onChatAction,
}: {
  proposal: ProposalData
  onChatAction: (msg: string) => void
}) {
  const p = proposal.payload as unknown as TransitionPayload

  return (
    <CardShell
      icon={<Sparkles className="w-4 h-4 text-[#D97706]" />}
      iconBg="bg-[#FFFBEB] dark:bg-[#3D2E0A]"
      title={proposal.title}
      actions={
        <>
          <ActionBtn icon={<ArrowRight className="w-3.5 h-3.5" />} label="需要，去测验" primary onClick={() => onChatAction('开始测验')} />
          <ActionBtn icon={<ChevronRight className="w-3.5 h-3.5" />} label="继续复习下一模块" onClick={() => onChatAction('继续复习下一模块')} />
        </>
      }
    >
      <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B]">
        模块 <strong className="text-[#37352F] dark:text-[#E8E8E8]">{p.module_name}</strong> 复习已完成。
      </p>
      <p className="text-[12px] text-[#787774] dark:text-[#9B9B9B] mt-1">{p.score_summary}</p>
    </CardShell>
  )
}

// ============================================================
// Proposal Card Router
// ============================================================

export default function ProposalCard({
  proposal,
  onChatAction,
}: {
  proposal: ProposalData
  onChatAction: (msg: string) => void
}) {
  switch (proposal.type) {
    case 'examiner':
      return <ExaminerProposalCard proposal={proposal} />
    case 'tutor_review':
      return <TutorReviewCard proposal={proposal} onChatAction={onChatAction} />
    case 'tutor_learning':
      return <TutorLearningCard proposal={proposal} onChatAction={onChatAction} />
    case 'transition':
      return <TransitionCardInner proposal={proposal} onChatAction={onChatAction} />
    default:
      return null
  }
}
