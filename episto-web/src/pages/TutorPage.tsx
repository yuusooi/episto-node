import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Send, Sparkles, Loader2, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../store'
import ProposalCard from '../components/chat/ProposalCards'
import type { ChatMessage } from '../types'

const THINKING_STEPS = [
  '正在唤醒主控调度...',
  'Ingestor 正在检索向量库...',
  'Examiner 正在分析知识点...',
  '正在生成回复...',
]

// ============================================================
// Message Row — modern bubble style
// ============================================================

function MessageRow({
  message,
  onChatAction,
}: {
  message: ChatMessage
  onChatAction: (msg: string) => void
}) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isUser
              ? 'bg-[#37352F] dark:bg-[#D3D3D3] text-white dark:text-[#191919]'
              : 'bg-gradient-to-br from-[#0075de] to-[#4DA3E8] text-white'
          }`}
        >
          {isUser ? <User className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className={`text-[11px] font-semibold ${isUser ? 'text-[#787774] dark:text-[#9B9B9B]' : 'text-[#0075de] dark:text-[#4DA3E8]'}`}>
              {isUser ? 'You' : 'Tutor'}
            </span>
            <span className="text-[10px] text-[#c4c4c4] dark:text-[#555] tabular-nums">
              {time}
            </span>
          </div>

          {isUser ? (
            <div className="bg-[#F0F0EE] dark:bg-[#2A2A2A] rounded-2xl rounded-tr-sm px-3 py-2">
              <p className="text-[13px] text-[#37352F] dark:text-[#D3D3D3] leading-[1.5] whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          ) : (
            <div className={`${message.isStreaming ? 'streaming-cursor' : ''}`}>
              {message.proposal ? (
                <ProposalCard proposal={message.proposal} onChatAction={onChatAction} />
              ) : (
                <div className="chat-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
              {!message.isStreaming && message.documentsLoaded && message.documentsLoaded.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FileText className="w-3 h-3 text-[#a39e98] dark:text-[#6B6B6B] shrink-0" />
                    <span className="text-[10px] text-[#a39e98] dark:text-[#6B6B6B]">参考文档:</span>
                    {message.documentsLoaded.map((doc, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F7F7F5] dark:bg-[#2A2A2A] text-[#787774] dark:text-[#9B9B9B]">
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Thinking indicator
// ============================================================

function ThinkingIndicator() {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % THINKING_STEPS.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex justify-start">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0075de] to-[#4DA3E8] text-white flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-1.5 pt-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0075de] dark:bg-[#4DA3E8] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#0075de] dark:bg-[#4DA3E8] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#0075de] dark:bg-[#4DA3E8] animate-bounce [animation-delay:300ms]" />
          <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] ml-1">
            {THINKING_STEPS[stepIdx]}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Tutor Page
// ============================================================

export default function TutorPage() {
  const messages = useAppStore((s) => s.tutorMessages)
  const isThinking = useAppStore((s) => s.tutorIsThinking)
  const sendTutorMessage = useAppStore((s) => s.sendTutorMessage)

  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [input])

  const handleChatAction = useCallback(
    (msg: string) => {
      setInput(msg)
      setTimeout(() => {
        const el = textareaRef.current
        if (el) {
          el.focus()
        }
      }, 0)
    },
    [],
  )

  const sendMessage = useCallback(() => {
    const text = input.trim()
    if (!text || isThinking) return
    setInput('')
    sendTutorMessage(text)
  }, [input, isThinking, sendTutorMessage])

  return (
    <div className="h-full flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-10 pt-8 pb-0 flex flex-col flex-1 min-h-0">
        {/* Page title */}
        <h1 className="text-[28px] font-bold text-[#37352F] dark:text-[#D3D3D3] leading-tight tracking-[-0.4px] mb-1">
          私教专区
        </h1>
        <p className="text-[14px] text-[#787774] dark:text-[#9B9B9B] mb-6">
          与 Tutor Agent 进行苏格拉底式对话，深度探索知识
        </p>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0075de] to-[#4DA3E8] flex items-center justify-center mb-3 shadow-lg shadow-[#0075de]/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <p className="text-[13px] font-semibold text-[#37352F] dark:text-[#D3D3D3] mb-0.5">
                  Tutor Agent 就绪
                </p>
                <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] text-center max-w-[240px]">
                  输入你的问题开始对话。我会用苏格拉底式提问引导你深入思考。
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} onChatAction={handleChatAction} />
            ))}

            {isThinking && !messages.some((m) => m.isStreaming) && <ThinkingIndicator />}

            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Input — floating with glow */}
      <div className="max-w-3xl mx-auto w-full px-10 py-4">
        <div
          className={`flex items-end gap-2 bg-[#F7F7F5] dark:bg-[#2A2A2A] rounded-xl px-3 py-2 border border-transparent transition-colors ${
            isThinking ? 'input-thinking' : 'focus-within:border-[#0075de] dark:focus-within:border-[#4DA3E8]'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="提问..."
            disabled={isThinking}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-[#37352F] dark:text-[#D3D3D3] placeholder-[#a39e98] dark:placeholder-[#6B6B6B] outline-none disabled:opacity-40 resize-none leading-[1.5] max-h-[120px]"
          />
          <button
            onClick={sendMessage}
            disabled={isThinking || !input.trim()}
            className="p-1.5 rounded-lg text-white bg-[#0075de] dark:bg-[#4DA3E8] hover:bg-[#0064c2] dark:hover:bg-[#3B8FD4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            {isThinking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
