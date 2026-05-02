// ============================================================
// episto-node Global Type Definitions
// ============================================================

/** Agent 引擎全局工作状态 */
export type AgentStatus = 'idle' | 'thinking' | 'generating_exam' | 'grading'

/** Multi-Agent 角色 */
export type AgentRole = 'lead' | 'tutor' | 'examiner' | 'ingestor'

/** Agent 活动流状态 */
export interface AgentStreamState {
  activeAgent: AgentRole | null
  label: string
  timestamp: number
}

/** 文档向量化状态 */
export type VectorStatus = 'Pending' | 'Processing' | 'Success' | 'Failed'

// ---- File System (Obsidian-style tree) ----

export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  /** Only for files */
  fileType?: 'md' | 'pdf'
  /** Mock content for preview */
  content?: string
  vectorStatus?: VectorStatus
}

// ---- Assessments (动态评测室) ----

export interface Question {
  question: string
  options: string[]
  answer: string
  explanation: string
}

export interface ExamPaper {
  title: string
  difficulty: string
  knowledgePoint: string
  questions: Question[]
}

export interface GradingResult {
  question_number: number
  question_text: string
  user_answer: string
  correct_answer: string
  is_correct: boolean
  topic: string
  explanation: string
}

export interface ExamRecord {
  id: string
  title: string
  knowledgePoint: string
  score: string
  completedAt: string
  /** Full exam paper for re-viewing */
  examPaper: ExamPaper
  /** Grading results if submitted */
  gradingResults: GradingResult[]
  /** User's submitted answers */
  userAnswers: Record<string, string>
  /** Whether the exam was submitted for grading */
  status: 'completed' | 'incomplete'
}

// ---- Tutor (私教专区) ----

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** Streaming partial content — while agent is still generating */
  isStreaming?: boolean
  /** If this message contains a structured proposal card */
  proposal?: ProposalData
  /** Which agent produced this message */
  agentRole?: AgentRole
  /** Documents retrieved from vector store for this response */
  documentsLoaded?: string[]
}

// ---- Tutor Conversations (多会话) ----

export interface TutorConversation {
  id: string
  title: string
  messages: ChatMessage[]
  threadId: string
  createdAt: number
  updatedAt: number
}

// ---- Proposal Cards (生成式卡片) ----

export type ProposalType = 'examiner' | 'tutor_review' | 'tutor_learning' | 'transition'

export interface ProposalData {
  type: ProposalType
  title: string
  payload: Record<string, unknown>
}

export interface ExaminerProposalPayload {
  knowledge_point: string
  default_multiple_choice: number
  default_open_ended: number
  default_difficulty: string
  suggested_title: string
}

export interface TutorReviewPayload {
  topics: { id: string; label: string; file_count: number }[]
  summary: string
}

export interface TutorLearningPayload {
  concept: string
  prerequisites: { title: string; status: 'ready' | 'in_progress' | 'completed' }[]
  estimated_steps: number
}

export interface TransitionPayload {
  module_name: string
  score_summary: string
}
