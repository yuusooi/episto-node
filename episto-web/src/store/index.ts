import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  AgentStatus,
  AgentRole,
  AgentStreamState,
  FileNode,
  ExamPaper,
  ExamRecord,
  GradingResult,
  ChatMessage,
  TutorConversation,
} from '../types'

// ============================================================
// Types for API responses
// ============================================================

export interface ReviewTask {
  id: string
  concept: string
  dueLabel: string
  agent: AgentRole
  action: string
}

interface WrongQuestionAlert {
  count: number
  knowledgePoint: string
  agent: AgentRole
}

interface KBStats {
  totalDocs: number
  totalSlices: number
  lastIngest: string
}

export interface WrongQuestion {
  id: number
  topic: string
  question_text: string
  user_answer: string
  correct_answer: string
  explanation: string
  created_at: string
}

// ============================================================
// Store Interface
// ============================================================

interface AppStore {
  // ---- Agent ----
  agentStatus: AgentStatus
  setAgentStatus: (s: AgentStatus) => void

  // ---- Theme ----
  isDark: boolean
  toggleTheme: () => void

  // ---- Sidebar ----
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // ---- File Tree ----
  fileTree: FileNode[]
  expandedFolders: string[]
  toggleFolder: (id: string) => void
  createFolder: (parentId: string | null, name: string) => void
  addFile: (parentId: string | null, name: string, fileType: 'md' | 'pdf', content?: string) => void
  deleteNode: (id: string) => void
  updateFileContent: (id: string, content: string) => void
  renameNode: (id: string, newName: string) => void
  moveNode: (nodeId: string, newParentId: string | null) => void

  // ---- Async Document Operations ----
  documentsLoading: boolean
  fetchDocuments: () => Promise<void>
  uploadDocument: (file: File) => Promise<void>
  ingestDocument: (documentId: string, name: string) => Promise<void>

  // ---- Active File ----
  activeFileId: string | null
  setActiveFileId: (id: string | null) => void

  // ---- Exam ----
  examReady: boolean
  currentExam: ExamPaper | null
  gradingResults: GradingResult[]
  gradeScore: string
  gradingFeedback: string
  gradingWrongCount: number
  examHistory: ExamRecord[]
  /** ID of the ExamRecord currently displayed on the page (live or viewing) */
  currentExamRecordId: string | null
  viewingExamRecordId: string | null
  setExamData: (exam: ExamPaper) => void
  setGradingResults: (results: GradingResult[]) => void
  setGradeScore: (score: string) => void
  clearExam: () => void
  addExamRecord: (record: ExamRecord) => void
  updateExamRecord: (id: string, updates: Partial<ExamRecord>) => void
  viewExamRecord: (id: string) => void
  exitExamRecord: () => void

  // ---- Wrong Questions ----
  wrongQuestions: WrongQuestion[]
  fetchWrongQuestions: () => Promise<void>

  // ---- Exam Generation (background-capable) ----
  examIsGenerating: boolean
  examStreamingText: string
  examIsGrading: boolean
  generateExam: (topic: string) => void
  generateReviewExam: (topics: string[]) => void
  submitExam: (answers: Record<string, string>) => void
  resetExamGeneration: () => void

  // ---- Notification ----
  notification: string | null
  setNotification: (msg: string | null) => void

  // ---- Tutor Panel ----
  tutorPanelOpen: boolean
  tutorPanelWidth: number
  toggleTutorPanel: () => void
  setTutorPanelWidth: (w: number) => void

  // ---- Agent Dashboard (fetched from API) ----
  backendOnline: boolean
  checkBackendHealth: () => Promise<void>
  reviewTasks: ReviewTask[]
  wrongQuestionAlert: WrongQuestionAlert
  kbStats: KBStats
  dashboardLoading: boolean
  fetchDashboardData: () => Promise<void>

  // ---- Agent Activity Stream ----
  agentStream: AgentStreamState[]
  pushAgentStream: (agent: AgentRole, label: string) => void
  clearAgentStream: () => void

  // ---- Tutor Chat (多会话) ----
  tutorConversations: TutorConversation[]
  activeTutorConversationId: string | null
  tutorMessages: ChatMessage[]
  tutorIsThinking: boolean
  sendTutorMessage: (text: string) => void
  clearTutorMessages: () => void
  createTutorConversation: () => void
  switchTutorConversation: (id: string) => void
  deleteTutorConversation: (id: string) => void
}

// ============================================================
// Tree Helpers
// ============================================================

function addChild(nodes: FileNode[], parentId: string | null, child: FileNode): FileNode[] {
  if (parentId === null) return [...nodes, child]
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), child] }
    }
    if (node.children) {
      return { ...node, children: addChild(node.children, parentId, child) }
    }
    return node
  })
}

function findFile(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findFile(node.children, id)
      if (found) return found
    }
  }
  return null
}

function removeNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) return { ...n, children: removeNode(n.children, id) }
      return n
    })
}

function updateNodeContent(nodes: FileNode[], id: string, content: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, content }
    if (n.children) return { ...n, children: updateNodeContent(n.children, id, content) }
    return n
  })
}

function renameNodeInTree(nodes: FileNode[], id: string, newName: string): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, name: newName }
    if (n.children) return { ...n, children: renameNodeInTree(n.children, id, newName) }
    return n
  })
}

function moveNodeInTree(nodes: FileNode[], nodeId: string, newParentId: string | null): FileNode[] {
  const nodeToMove = findFile(nodes, nodeId)
  if (!nodeToMove) return nodes
  const without = removeNode(nodes, nodeId)
  return addChild(without, newParentId, nodeToMove)
}

function isDescendantOf(ancestor: FileNode, nodeId: string): boolean {
  if (!ancestor.children) return false
  for (const child of ancestor.children) {
    if (child.id === nodeId) return true
    if (child.children && isDescendantOf(child, nodeId)) return true
  }
  return false
}

// ============================================================
// API Helpers
// ============================================================

const API_BASE = '/api'

// ---- Tutor streaming state (module-level, survives navigation) ----

let tutorAbortController: AbortController | null = null

// ---- Exam streaming state (module-level, survives navigation) ----

let examAbortController: AbortController | null = null

function resetTutorThreadId(): string {
  const KEY = 'episto_tutor_thread_id'
  const id = uuidv4()
  sessionStorage.setItem(KEY, id)
  return id
}

function abortTutorStream() {
  tutorAbortController?.abort()
  tutorAbortController = null
}

/** Start SSE stream for tutor chat. Runs entirely outside React lifecycle. */
function startTutorStream(
  message: string,
  assistantId: string,
  threadId: string,
  onToken: (id: string, token: string) => void,
  onDone: (id: string, data: { documents_loaded?: string[] }) => void,
  onError: (id: string, msg: string) => void,
) {
  abortTutorStream()
  const controller = new AbortController()
  tutorAbortController = controller

  let tid = threadId

  const doStream = async (tid: string) => {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: tid, message }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              onDone(assistantId, data)
            } else if (data.error) {
              throw new Error(data.error)
            } else if (data.content) {
              onToken(assistantId, data.content)
            }
          } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError' && !String(e).startsWith('SyntaxError')) throw e
          }
        }
      }
    }
  }

  doStream(tid).catch((err) => {
    if (err instanceof Error && err.name === 'AbortError') return
    // On 500, retry with new thread
    if (err instanceof Error && err.message.includes('HTTP 5')) {
      tid = resetTutorThreadId()
      doStream(tid).catch((retryErr) => {
        onError(
          assistantId,
          retryErr instanceof TypeError
            ? '无法连接到后端。请确认服务已启动。'
            : `后端错误: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
        )
      })
    } else {
      onError(
        assistantId,
        err instanceof TypeError
          ? '无法连接到后端。请确认服务已启动。'
          : `后端错误: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })
}

// ---- Tutor conversation persistence helpers ----

const TUTOR_CONVERSATIONS_KEY = 'episto_tutor_conversations'
const TUTOR_ACTIVE_ID_KEY = 'episto_tutor_active_id'

function cleanStreamingMessages(msgs: ChatMessage[]): ChatMessage[] {
  return msgs.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
}

function loadTutorConversations(): TutorConversation[] {
  try {
    const raw = localStorage.getItem(TUTOR_CONVERSATIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TutorConversation[]
    return parsed.map((c) => ({
      ...c,
      messages: cleanStreamingMessages(c.messages),
    }))
  } catch {
    return []
  }
}

function loadActiveTutorId(): string | null {
  try {
    return localStorage.getItem(TUTOR_ACTIVE_ID_KEY)
  } catch {
    return null
  }
}

function persistTutorState(
  conversations: TutorConversation[],
  activeId: string | null,
  currentMessages: ChatMessage[],
) {
  try {
    // Archive current messages into the right conversation slot
    const convs = [...conversations]
    if (activeId) {
      const idx = convs.findIndex((c) => c.id === activeId)
      if (idx >= 0) {
        convs[idx] = { ...convs[idx], messages: cleanStreamingMessages(currentMessages), updatedAt: Date.now() }
      }
    }
    localStorage.setItem(TUTOR_CONVERSATIONS_KEY, JSON.stringify(convs))
    if (activeId) {
      localStorage.setItem(TUTOR_ACTIVE_ID_KEY, activeId)
    } else {
      localStorage.removeItem(TUTOR_ACTIVE_ID_KEY)
    }
  } catch {}
}

// ---- Exam streaming helpers (module-level) ----

function getExamThreadId(): string {
  const KEY = 'episto_exam_thread'
  const existing = sessionStorage.getItem(KEY)
  if (existing) return existing
  const id = uuidv4()
  sessionStorage.setItem(KEY, id)
  return id
}

function resetExamThreadId(): string {
  const KEY = 'episto_exam_thread'
  const id = uuidv4()
  sessionStorage.setItem(KEY, id)
  return id
}

function abortExamStream() {
  examAbortController?.abort()
  examAbortController = null
}

interface ExamStreamCallbacks {
  onToken: (token: string) => void
  onDone: (data: { reply: string; exam_paper?: ExamPaper | null }) => void
  onError: (msg: string) => void
}

/** Start SSE stream for exam generation. Runs entirely outside React lifecycle. */
function startExamStream(
  message: string,
  { onToken, onDone, onError }: ExamStreamCallbacks,
) {
  abortExamStream()
  const controller = new AbortController()
  examAbortController = controller

  let threadId = getExamThreadId()

  const doStream = async (tid: string) => {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: tid, message }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.done) {
              onDone(data)
            } else if (data.error) {
              throw new Error(data.error)
            } else if (data.content) {
              onToken(data.content)
            }
          } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError' && !String(e).startsWith('SyntaxError')) throw e
          }
        }
      }
    }
  }

  doStream(threadId).catch((err) => {
    if (err instanceof Error && err.name === 'AbortError') return
    if (err instanceof Error && err.message.includes('HTTP 5')) {
      threadId = resetExamThreadId()
      doStream(threadId).catch((retryErr) => {
        onError(
          retryErr instanceof TypeError
            ? '无法连接到后端。请确认服务已启动。'
            : `后端错误: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
        )
      })
    } else {
      onError(
        err instanceof TypeError
          ? '无法连接到后端。请确认服务已启动。'
          : `后端错误: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  })
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ============================================================
// Store
// ============================================================

export const useAppStore = create<AppStore>((set, get) => ({
  // Agent
  agentStatus: 'idle',
  setAgentStatus: (agentStatus) => set({ agentStatus }),

  // Theme — apply dark class on init
  isDark: (() => {
    if (typeof window === 'undefined') return false
    const dark = localStorage.getItem('episto_theme') === 'dark'
    if (dark) document.documentElement.classList.add('dark')
    return dark
  })(),
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('episto_theme', next ? 'dark' : 'light')
      return { isDark: next }
    }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // File Tree — starts empty, populated by fetchDocuments()
  fileTree: [],
  expandedFolders: [],
  toggleFolder: (id) =>
    set((s) => ({
      expandedFolders: s.expandedFolders.includes(id)
        ? s.expandedFolders.filter((fid) => fid !== id)
        : [...s.expandedFolders, id],
    })),
  createFolder: (parentId, name) => {
    const folder: FileNode = { id: uuidv4(), name, type: 'folder', children: [] }
    set((s) => ({
      fileTree: addChild(s.fileTree, parentId, folder),
      expandedFolders: parentId ? [...s.expandedFolders, parentId] : s.expandedFolders,
    }))
  },
  addFile: (parentId, name, fileType, content) => {
    const file: FileNode = {
      id: uuidv4(),
      name,
      type: 'file',
      fileType,
      content,
      vectorStatus: 'Pending',
    }
    set((s) => {
      const newExpanded = parentId && !s.expandedFolders.includes(parentId)
        ? [...s.expandedFolders, parentId]
        : s.expandedFolders
      return {
        fileTree: addChild(s.fileTree, parentId, file),
        expandedFolders: newExpanded,
      }
    })
  },
  deleteNode: (id) => {
    set((s) => ({
      fileTree: removeNode(s.fileTree, id),
      activeFileId: s.activeFileId === id ? null : s.activeFileId,
    }))
  },
  updateFileContent: (id, content) => {
    set((s) => ({ fileTree: updateNodeContent(s.fileTree, id, content) }))
  },
  renameNode: (id, newName) => {
    set((s) => ({ fileTree: renameNodeInTree(s.fileTree, id, newName) }))
  },
  moveNode: (nodeId, newParentId) => {
    set((s) => {
      // Prevent dropping a folder into its own descendant
      if (newParentId !== null) {
        const targetParent = findFile(s.fileTree, newParentId)
        if (targetParent && targetParent.type === 'folder' && isDescendantOf(targetParent, nodeId)) {
          return s
        }
      }
      // Auto-expand target folder
      const newExpanded = newParentId && !s.expandedFolders.includes(newParentId)
        ? [...s.expandedFolders, newParentId]
        : s.expandedFolders
      return {
        fileTree: moveNodeInTree(s.fileTree, nodeId, newParentId),
        expandedFolders: newExpanded,
      }
    })
  },

  // ---- Async Document Operations ----
  documentsLoading: false,

  fetchDocuments: async () => {
    set({ documentsLoading: true })
    try {
      const data = await apiFetch<{ documents: Array<{
        id: string
        name: string
        file_type: string
        vector_status: string
        content: string
      }> }>('/documents')

      // Merge: keep locally-added files (not from backend) + backend files
      const backendIds = new Set(data.documents.map((d) => d.id))
      set((s) => {
        const localOnly = s.fileTree.filter((n) => !backendIds.has(n.id))
        const backendFiles: FileNode[] = data.documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          type: 'file' as const,
          fileType: doc.file_type as 'md' | 'pdf',
          content: doc.content,
          vectorStatus: doc.vector_status as FileNode['vectorStatus'],
        }))
        return { fileTree: [...localOnly, ...backendFiles], documentsLoading: false }
      })
    } catch (err) {
      // API not available — keep local tree as-is
      console.error('fetchDocuments failed (keeping local tree):', err)
      set({ documentsLoading: false })
    }
  },

  uploadDocument: async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const isText = ext === 'md' || ext === 'txt'
    const fileType = isText ? 'md' as const : 'pdf' as const

    // Read content for local preview
    let content = ''
    if (isText) {
      try { content = await file.text() } catch {}
    }

    // Optimistic: add to local tree immediately with "Processing" status
    const localId = uuidv4()
    set((s) => ({
      fileTree: addChild(s.fileTree, null, {
        id: localId,
        name: file.name,
        type: 'file',
        fileType,
        content: content || undefined,
        vectorStatus: 'Processing',
      }),
    }))

    // Background: upload to backend for vectorization
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`Upload failed: ${text}`)
      }

      const result = await res.json() as {
        id: string
        name: string
        file_type: string
        chunks: number
        vector_status: string
      }

      // Update local node with backend vector status
      set((s) => ({
        fileTree: s.fileTree.map((node) =>
          node.id === localId
            ? { ...node, vectorStatus: result.vector_status as FileNode['vectorStatus'] }
            : node
        ),
      }))

      // Refresh dashboard stats
      get().fetchDashboardData()
    } catch (err) {
      console.error('uploadDocument backend call failed:', err)
      // Mark as Pending (vectorization didn't happen) but keep file in tree
      set((s) => ({
        fileTree: s.fileTree.map((node) =>
          node.id === localId ? { ...node, vectorStatus: 'Pending' as const } : node
        ),
      }))
    }
  },

  ingestDocument: async (documentId: string, name: string) => {
    try {
      await apiFetch<{ document_id: string; chunks: number; status: string }>('/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId, name }),
      })
      // Refresh documents to get updated status
      await get().fetchDocuments()
      await get().fetchDashboardData()
    } catch (err) {
      console.error('ingestDocument failed:', err)
      throw err
    }
  },

  // Active File
  activeFileId: null,
  setActiveFileId: (activeFileId) => set({ activeFileId }),

  // Exam
  examReady: false,
  currentExam: null,
  gradingResults: [],
  gradeScore: '',
  gradingFeedback: '',
  gradingWrongCount: 0,
  currentExamRecordId: null,
  viewingExamRecordId: null,
  examHistory: (() => {
    try { const v = localStorage.getItem('episto_exam_history'); return v ? JSON.parse(v) : [] } catch { return [] }
  })(),
  setExamData: (exam) => {
    // Auto-save to exam history as incomplete
    const now = new Date()
    const recordId = uuidv4()
    const record: ExamRecord = {
      id: recordId,
      title: exam.title,
      knowledgePoint: exam.knowledgePoint,
      score: '',
      completedAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      examPaper: exam,
      gradingResults: [],
      userAnswers: {},
      status: 'incomplete',
    }
    const s = useAppStore.getState()
    const next = [record, ...s.examHistory].slice(0, 50)
    try { localStorage.setItem('episto_exam_history', JSON.stringify(next)) } catch {}

    set({
      currentExam: exam,
      examReady: true,
      gradingResults: [],
      gradeScore: '',
      gradingFeedback: '',
      gradingWrongCount: 0,
      currentExamRecordId: recordId,
      examHistory: next,
      notification: `episto-node 新考卷已生成 — "${exam.title}"`,
    })
  },
  setGradingResults: (gradingResults) => set({ gradingResults }),
  setGradeScore: (gradeScore) => set({ gradeScore }),
  clearExam: () =>
    set({ currentExam: null, examReady: false, gradingResults: [], gradeScore: '' }),
  addExamRecord: (record) =>
    set((s) => {
      const next = [record, ...s.examHistory].slice(0, 50)
      try { localStorage.setItem('episto_exam_history', JSON.stringify(next)) } catch {}
      return { examHistory: next }
    }),

  updateExamRecord: (id, updates) =>
    set((s) => {
      const next = s.examHistory.map((r) => (r.id === id ? { ...r, ...updates } : r))
      try { localStorage.setItem('episto_exam_history', JSON.stringify(next)) } catch {}
      return { examHistory: next }
    }),

  viewExamRecord: (id) => {
    const record = useAppStore.getState().examHistory.find((r) => r.id === id)
    if (!record || !record.examPaper) return
    const isIncomplete = record.status === 'incomplete'
    set({
      viewingExamRecordId: isIncomplete ? null : id,
      currentExamRecordId: id,
      currentExam: record.examPaper,
      gradingResults: record.gradingResults ?? [],
      gradeScore: record.score,
      gradingFeedback: '',
      gradingWrongCount: 0,
    })
  },

  exitExamRecord: () => {
    set({
      viewingExamRecordId: null,
      currentExamRecordId: null,
      currentExam: null,
      gradingResults: [],
      gradeScore: '',
    })
  },

  // Wrong Questions
  wrongQuestions: [],
  fetchWrongQuestions: async () => {
    try {
      const data = await apiFetch<{ questions: WrongQuestion[]; total: number }>('/wrong_questions')
      set({ wrongQuestions: data.questions })
    } catch (err) {
      console.error('fetchWrongQuestions failed:', err)
    }
  },

  // ---- Exam Generation (background-capable) ----
  examIsGenerating: false,
  examStreamingText: '',
  examIsGrading: false,

  generateExam: (topic) => {
    set({
      examIsGenerating: true,
      examStreamingText: '',
      agentStatus: 'generating_exam' as AgentStatus,
      viewingExamRecordId: null,
    })
    // Clear previous exam
    get().clearExam()

    // Reset thread so Examiner gets a fresh conversation
    resetExamThreadId()

    const message = `请出 4 道关于「${topic}」的选择题，难度适中。每题 4 个选项，给出正确答案和解析。`

    startExamStream(message, {
      onToken: (token) => {
        set((s) => ({ examStreamingText: s.examStreamingText + token }))
      },
      onDone: (data) => {
        set({
          examIsGenerating: false,
          agentStatus: 'idle' as AgentStatus,
        })
        const examPaper = data.exam_paper as ExamPaper | null
        if (examPaper && examPaper.questions && examPaper.questions.length > 0) {
          get().setExamData(examPaper)
        }
        set({ examStreamingText: '' })
      },
      onError: (msg) => {
        set({
          examIsGenerating: false,
          agentStatus: 'idle' as AgentStatus,
          examStreamingText: '',
          notification: `出题失败: ${msg}`,
        })
      },
    })
  },

  generateReviewExam: (topics) => {
    const topicStr = topics.join('、')
    get().generateExam(topicStr)
  },

  submitExam: async (answers) => {
    const threadId = getExamThreadId()
    const currentExam = get().currentExam
    if (!threadId || !currentExam) return

    set({ examIsGrading: true, agentStatus: 'grading' as AgentStatus })

    try {
      const res = await fetch(`${API_BASE}/submit_exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, answers }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`Submit failed: ${text}`)
      }

      const data = await res.json()
      const gradingResults = data.results ?? []
      const gradeScore = data.score ?? ''
      const gradingFeedback = data.feedback ?? ''
      const gradingWrongCount = data.wrong_questions_count ?? 0
      get().setGradingResults(gradingResults)
      get().setGradeScore(gradeScore)
      set({ gradingFeedback, gradingWrongCount })

      // Update the existing incomplete record to completed
      const now = new Date()
      const recordId = get().currentExamRecordId
      if (recordId) {
        get().updateExamRecord(recordId, {
          score: gradeScore,
          completedAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          gradingResults,
          userAnswers: answers,
          status: 'completed',
        })
      } else {
        // Fallback: no existing record (e.g. legacy flow), create new
        const record: ExamRecord = {
          id: uuidv4(),
          title: currentExam.title,
          knowledgePoint: currentExam.knowledgePoint,
          score: gradeScore,
          completedAt: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          examPaper: currentExam,
          gradingResults,
          userAnswers: answers,
          status: 'completed',
        }
        get().addExamRecord(record)
      }
    } catch (err) {
      console.error('Submit exam failed:', err)
      const errMsg = err instanceof Error ? err.message : String(err)
      set({ notification: `提交失败: ${errMsg}` })
    } finally {
      set({ examIsGrading: false, agentStatus: 'idle' as AgentStatus })
    }
  },

  resetExamGeneration: () => {
    abortExamStream()
    get().clearExam()
    resetExamThreadId()
    set({ examIsGenerating: false, examStreamingText: '', examIsGrading: false, viewingExamRecordId: null, currentExamRecordId: null })
  },

  // Notification
  notification: null,
  setNotification: (notification) => set({ notification }),

  // Tutor Panel
  tutorPanelOpen: (() => {
    try { return localStorage.getItem('episto_tutorPanelOpen') === 'true' } catch { return false }
  })(),
  tutorPanelWidth: (() => {
    try { const v = localStorage.getItem('episto_tutorPanelWidth'); return v ? Number(v) : 340 } catch { return 340 }
  })(),
  toggleTutorPanel: () => set((s) => {
    const next = !s.tutorPanelOpen
    try { localStorage.setItem('episto_tutorPanelOpen', String(next)) } catch {}
    return { tutorPanelOpen: next }
  }),
  setTutorPanelWidth: (tutorPanelWidth) => {
    try { localStorage.setItem('episto_tutorPanelWidth', String(tutorPanelWidth)) } catch {}
    set({ tutorPanelWidth })
  },

  // Agent Dashboard — starts with empty defaults, populated by fetchDashboardData()
  backendOnline: false,
  checkBackendHealth: async () => {
    try {
      const res = await fetch('/health')
      set({ backendOnline: res.ok })
    } catch {
      set({ backendOnline: false })
    }
  },
  reviewTasks: [],
  wrongQuestionAlert: { count: 0, knowledgePoint: '', agent: 'examiner' as AgentRole },
  kbStats: { totalDocs: 0, totalSlices: 0, lastIngest: '' },
  dashboardLoading: false,

  fetchDashboardData: async () => {
    set({ dashboardLoading: true })
    try {
      const data = await apiFetch<{
        review_tasks: Array<{
          id: string
          concept: string
          due_label: string
          agent: string
          action: string
        }>
        wrong_question_count: number
        wrong_question_knowledge_point: string
        total_documents: number
        total_slices: number
        last_ingest: string
      }>('/dashboard')

      set({
        reviewTasks: data.review_tasks.map((t) => ({
          id: t.id,
          concept: t.concept,
          dueLabel: t.due_label,
          agent: t.agent as AgentRole,
          action: t.action,
        })),
        wrongQuestionAlert: {
          count: data.wrong_question_count,
          knowledgePoint: data.wrong_question_knowledge_point,
          agent: 'examiner' as AgentRole,
        },
        kbStats: {
          totalDocs: data.total_documents,
          totalSlices: data.total_slices,
          lastIngest: data.last_ingest,
        },
        dashboardLoading: false,
      })
    } catch (err) {
      console.error('fetchDashboardData failed:', err)
      set({ dashboardLoading: false })
    }
  },

  // Agent Activity Stream
  agentStream: [],
  pushAgentStream: (agent, label) =>
    set((s) => ({
      agentStream: [...s.agentStream.slice(-8), { activeAgent: agent, label, timestamp: Date.now() }],
    })),
  clearAgentStream: () => set({ agentStream: [] }),

  // ---- Tutor Chat (多会话) ----

  // Load initial state from localStorage
  tutorConversations: loadTutorConversations(),
  activeTutorConversationId: loadActiveTutorId(),
  tutorMessages: (() => {
    const convs = loadTutorConversations()
    const activeId = loadActiveTutorId()
    if (!activeId) return []
    const active = convs.find((c) => c.id === activeId)
    return active ? active.messages : []
  })(),
  tutorIsThinking: false,

  sendTutorMessage: (text) => {
    const state = get()
    let convs = [...state.tutorConversations]
    let activeId = state.activeTutorConversationId
    let messages = state.tutorMessages

    // Auto-create conversation if none active
    if (!activeId) {
      const threadId = uuidv4()
      sessionStorage.setItem('episto_tutor_thread_id', threadId)
      const newConv: TutorConversation = {
        id: uuidv4(),
        title: '',
        messages: [],
        threadId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      activeId = newConv.id
      convs = [newConv, ...convs]
      messages = []
    }

    // Auto-title from first user message
    const conv = convs.find((c) => c.id === activeId)
    if (conv && !conv.title) {
      const title = text.length > 20 ? text.slice(0, 20) + '...' : text
      const idx = convs.indexOf(conv)
      convs[idx] = { ...conv, title }
    }

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    const assistantId = uuidv4()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }

    const nextMessages = [...messages, userMsg, assistantMsg]
    set({
      tutorConversations: convs,
      activeTutorConversationId: activeId,
      tutorMessages: nextMessages,
      tutorIsThinking: true,
      agentStatus: 'thinking' as AgentStatus,
    })

    const persist = () => {
      const s = useAppStore.getState()
      persistTutorState(s.tutorConversations, s.activeTutorConversationId, s.tutorMessages)
    }

    // Get threadId for the current conversation
    const currentConv = useAppStore.getState().tutorConversations.find((c) => c.id === activeId)
    const threadId = currentConv?.threadId ?? sessionStorage.getItem('episto_tutor_thread_id') ?? uuidv4()

    startTutorStream(
      text,
      assistantId,
      threadId,
      // onToken
      (id, token) => {
        set((s) => ({
          tutorMessages: s.tutorMessages.map((m) =>
            m.id === id ? { ...m, content: m.content + token } : m
          ),
        }))
        persist()
      },
      // onDone
      (id, data) => {
        const docs = data.documents_loaded ?? []
        set((s) => ({
          tutorMessages: s.tutorMessages.map((m) =>
            m.id === id ? { ...m, isStreaming: false, documentsLoaded: docs.length > 0 ? docs : undefined } : m
          ),
          tutorIsThinking: false,
          agentStatus: 'idle' as AgentStatus,
        }))
        persist()
      },
      // onError
      (id, msg) => {
        set((s) => ({
          tutorMessages: s.tutorMessages.map((m) =>
            m.id === id ? { ...m, content: msg, isStreaming: false } : m
          ),
          tutorIsThinking: false,
          agentStatus: 'idle' as AgentStatus,
        }))
        persist()
      },
    )
  },

  clearTutorMessages: () => {
    abortTutorStream()
    const state = get()
    // Archive current messages before clearing
    persistTutorState(state.tutorConversations, state.activeTutorConversationId, state.tutorMessages)
    set({ tutorMessages: [], tutorIsThinking: false, activeTutorConversationId: null })
    localStorage.removeItem(TUTOR_ACTIVE_ID_KEY)
  },

  createTutorConversation: () => {
    abortTutorStream()
    const state = get()

    // Archive current conversation
    let convs = [...state.tutorConversations]
    if (state.activeTutorConversationId) {
      const idx = convs.findIndex((c) => c.id === state.activeTutorConversationId)
      if (idx >= 0) {
        convs[idx] = {
          ...convs[idx],
          messages: cleanStreamingMessages(state.tutorMessages),
          updatedAt: Date.now(),
        }
      }
    }

    // Create new conversation
    const threadId = uuidv4()
    sessionStorage.setItem('episto_tutor_thread_id', threadId)
    const newConv: TutorConversation = {
      id: uuidv4(),
      title: '',
      messages: [],
      threadId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    convs = [newConv, ...convs].slice(0, 50)

    set({
      tutorConversations: convs,
      activeTutorConversationId: newConv.id,
      tutorMessages: [],
      tutorIsThinking: false,
    })
    persistTutorState(convs, newConv.id, [])
  },

  switchTutorConversation: (id) => {
    const state = get()
    if (id === state.activeTutorConversationId) return
    abortTutorStream()

    // Archive current messages into its conversation slot
    let convs = [...state.tutorConversations]
    if (state.activeTutorConversationId) {
      const idx = convs.findIndex((c) => c.id === state.activeTutorConversationId)
      if (idx >= 0) {
        convs[idx] = {
          ...convs[idx],
          messages: cleanStreamingMessages(state.tutorMessages),
          updatedAt: Date.now(),
        }
      }
    }

    // Load target conversation
    const target = convs.find((c) => c.id === id)
    if (!target) return

    // Restore threadId to sessionStorage
    sessionStorage.setItem('episto_tutor_thread_id', target.threadId)

    set({
      tutorConversations: convs,
      activeTutorConversationId: id,
      tutorMessages: target.messages,
      tutorIsThinking: false,
    })
    persistTutorState(convs, id, target.messages)
  },

  deleteTutorConversation: (id) => {
    const state = get()
    let convs = state.tutorConversations.filter((c) => c.id !== id)

    if (id === state.activeTutorConversationId) {
      // Deleting active conversation — switch to first or clear
      abortTutorStream()
      if (convs.length > 0) {
        const next = convs[0]
        sessionStorage.setItem('episto_tutor_thread_id', next.threadId)
        set({
          tutorConversations: convs,
          activeTutorConversationId: next.id,
          tutorMessages: next.messages,
          tutorIsThinking: false,
        })
        persistTutorState(convs, next.id, next.messages)
      } else {
        set({
          tutorConversations: [],
          activeTutorConversationId: null,
          tutorMessages: [],
          tutorIsThinking: false,
        })
        persistTutorState([], null, [])
      }
    } else {
      set({ tutorConversations: convs })
      persistTutorState(convs, state.activeTutorConversationId, state.tutorMessages)
    }
  },
}))

// Utility: find file in tree
export function findFileNode(id: string): FileNode | null {
  return findFile(useAppStore.getState().fileTree, id)
}

// Utility: check if nodeId is a descendant of ancestorId
export function checkIsDescendant(ancestorId: string, nodeId: string): boolean {
  const ancestor = findFile(useAppStore.getState().fileTree, ancestorId)
  if (!ancestor) return false
  return isDescendantOf(ancestor, nodeId)
}
