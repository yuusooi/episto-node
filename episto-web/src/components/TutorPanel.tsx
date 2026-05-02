import { useState, useEffect, useRef, useCallback } from "react";
import {
  User,
  Loader2,
  Send,
  X,
  Brain,
  GraduationCap,
  ClipboardCheck,
  Database,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore, findFileNode } from "../store";
import { v4 as uuidv4 } from "uuid";
import { useChatStream } from "../hooks/useChatStream";
import ProposalCard from "./chat/ProposalCards";
import type { ChatMessage, AgentRole } from "../types";

const THINKING_STEPS = [
  "正在分析文件内容...",
  "检索相关知识...",
  "生成回复...",
];

// Agent visual config — different persona per role
const AGENT_STYLE: Record<
  AgentRole,
  {
    icon: typeof Brain;
    label: string;
    iconBg: string;
    labelColor: string;
    bubbleBorder?: string;
    bubbleBg?: string;
  }
> = {
  tutor: {
    icon: GraduationCap,
    label: "Tutor",
    iconBg: "bg-[#FEF9C3] dark:bg-[#3D350A] text-[#92400E] dark:text-[#FCD34D]",
    labelColor: "text-[#92400E] dark:text-[#FCD34D]",
    bubbleBg: "bg-[#FEFCE8]/40 dark:bg-[#3D350A]/30",
  },
  examiner: {
    icon: ClipboardCheck,
    label: "Examiner",
    iconBg: "bg-[#EFF6FF] dark:bg-[#1E2A3A] text-[#0075de] dark:text-[#4DA3E8]",
    labelColor: "text-[#0075de] dark:text-[#4DA3E8]",
    bubbleBorder: "border border-[#E9E9E7] dark:border-[#2A2A2A]",
  },
  lead: {
    icon: Brain,
    label: "Lead",
    iconBg: "bg-[#F7F7F5] dark:bg-[#2A2A2A] text-[#787774] dark:text-[#9B9B9B]",
    labelColor: "text-[#787774] dark:text-[#9B9B9B]",
    bubbleBorder: "border border-dashed border-[#E9E9E7] dark:border-[#2A2A2A]",
    bubbleBg: "bg-[#FAFAFA] dark:bg-[#1A1A1A]",
  },
  ingestor: {
    icon: Database,
    label: "Ingestor",
    iconBg: "bg-[#F0FDF4] dark:bg-[#14352A] text-[#059669] dark:text-[#34D399]",
    labelColor: "text-[#059669] dark:text-[#34D399]",
    bubbleBg: "bg-[#F0FDF4]/30 dark:bg-[#14352A]/30",
  },
};

// Message Row — multi-persona bubble style
function MessageRow({
  message,
  onChatAction,
}: {
  message: ChatMessage;
  onChatAction: (msg: string) => void;
}) {
  const isUser = message.role === "user";
  const time = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Pick agent style, default to tutor
  const role = message.agentRole ?? "tutor";
  const style = isUser ? null : AGENT_STYLE[role];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div
        className={`flex gap-2 max-w-[92%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isUser
              ? "bg-[#37352F] dark:bg-[#D3D3D3] text-white dark:text-[#191919]"
              : style!.iconBg
          }`}
        >
          {isUser ? (
            <User className="w-3 h-3" />
          ) : (
            (() => {
              const Icon = style!.icon;
              return <Icon className="w-3 h-3" />;
            })()
          )}
        </div>

        {/* Bubble */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span
              className={`text-[11px] font-semibold ${isUser ? "text-[#787774] dark:text-[#9B9B9B]" : style!.labelColor}`}
            >
              {isUser ? "You" : style!.label}
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
            <div
              className={`rounded-xl px-3 py-2 ${message.isStreaming ? "streaming-cursor" : ""} ${style!.bubbleBg ?? ""} ${style!.bubbleBorder ?? ""}`}
            >
              {message.proposal ? (
                <ProposalCard
                  proposal={message.proposal}
                  onChatAction={onChatAction}
                />
              ) : (
                <div className="chat-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Thinking indicator
function ThinkingIndicator() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#FEF9C3] dark:bg-[#3D350A] text-[#92400E] dark:text-[#FCD34D] flex items-center justify-center shrink-0 mt-0.5">
          <GraduationCap className="w-3 h-3" />
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
  );
}

// Resize Handle
function ResizeHandle({
  width,
  onWidthChange,
}: {
  width: number;
  onWidthChange: (w: number) => void;
}) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = startX.current - ev.clientX;
        const next = Math.max(280, Math.min(560, startWidth.current + delta));
        onWidthChange(next);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, onWidthChange],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#0075de]/20 dark:hover:bg-[#4DA3E8]/20 transition-colors z-10"
      title="拖拽调节宽度"
    />
  );
}

// Tutor Panel
export default function TutorPanel() {
  const tutorPanelOpen = useAppStore((s) => s.tutorPanelOpen);
  const tutorPanelWidth = useAppStore((s) => s.tutorPanelWidth);
  const setTutorPanelWidth = useAppStore((s) => s.setTutorPanelWidth);
  const toggleTutorPanel = useAppStore((s) => s.toggleTutorPanel);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const setAgentStatus = useAppStore((s) => s.setAgentStatus);

  const STORAGE_KEY = "episto_tutor_panel_messages";

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { streamChat } = useChatStream();

  // Persist messages to localStorage (skip streaming ones)
  useEffect(() => {
    try {
      const toSave = messages.filter((m) => !m.isStreaming);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, [input]);

  const buildContextMessage = useCallback(
    (userText: string): string => {
      if (!activeFileId) return userText;
      const file = findFileNode(activeFileId);
      if (!file || file.type !== "file") return userText;
      const content = file.content ?? "";
      if (!content) return `[当前文件: ${file.name}（空文件）]\n\n${userText}`;
      const MAX_CTX = 3000;
      const truncated =
        content.length > MAX_CTX
          ? content.slice(0, MAX_CTX) + "\n[...内容已截断]"
          : content;
      return `[当前文件: ${file.name}]\n${truncated}\n\n---\n用户问题: ${userText}`;
    },
    [activeFileId],
  );

  const handleChatAction = useCallback((msg: string) => {
    setInput(msg);
    // Use setTimeout to ensure state update before sending
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        // Trigger the send via a custom event or direct call
      }
    }, 0);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    // Create a placeholder for the streaming response
    const assistantId = uuidv4();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsThinking(true);
    setAgentStatus("thinking");

    const contextMessage = buildContextMessage(text);

    await streamChat(contextMessage, "episto_tutor_panel_thread", {
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + token } : m,
          ),
        );
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
      },
      onError: (msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: msg, isStreaming: false }
              : m,
          ),
        );
      },
    });

    setIsThinking(false);
    setAgentStatus("idle");
  }, [input, isThinking, setAgentStatus, buildContextMessage, streamChat]);

  if (!tutorPanelOpen) return null;

  const activeFile = activeFileId ? findFileNode(activeFileId) : null;

  return (
    <div
      className="relative shrink-0 h-full border-l border-[#E9E9E7] dark:border-[#2A2A2A] bg-white dark:bg-[#191919] flex flex-col"
      style={{ width: tutorPanelWidth }}
    >
      <ResizeHandle
        width={tutorPanelWidth}
        onWidthChange={setTutorPanelWidth}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E9E9E7] dark:border-[#2A2A2A] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-[#F7F7F5] dark:bg-[#2A2A2A] flex items-center justify-center">
            <Brain className="w-3 h-3 text-[#787774] dark:text-[#9B9B9B]" />
          </div>
          <span className="text-[13px] font-semibold text-[#37352F] dark:text-[#D3D3D3]">
            Copilot
          </span>
        </div>
        <button
          onClick={toggleTutorPanel}
          className="p-0.5 rounded text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#37352F] dark:hover:text-[#D3D3D3] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
          title="关闭面板"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File context indicator */}
      {activeFile && activeFile.type === "file" && (
        <div className="px-3 py-1.5 border-b border-[#E9E9E7] dark:border-[#2A2A2A] bg-[#f2f9ff] dark:bg-[#1E2A3A] shrink-0">
          <p className="text-[10px] text-[#0075de] dark:text-[#4DA3E8] truncate">
            已关联: {activeFile.name}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] dark:bg-[#2A2A2A] flex items-center justify-center mb-3">
                <Brain className="w-5 h-5 text-[#787774] dark:text-[#9B9B9B]" />
              </div>
              <p className="text-[13px] font-semibold text-[#37352F] dark:text-[#D3D3D3] mb-0.5">
                Multi-Agent Copilot 就绪
              </p>
              <p className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] text-center max-w-[200px]">
                {activeFile
                  ? `已关联「${activeFile.name}」，可直接提问`
                  : "打开文件后可基于文件内容回答问题"}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageRow
              key={msg.id}
              message={msg}
              onChatAction={handleChatAction}
            />
          ))}

          {isThinking && !messages.some((m) => m.isStreaming) && (
            <ThinkingIndicator />
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input — floating with glow */}
      <div className="px-3 py-2.5 border-t border-[#E9E9E7] dark:border-[#2A2A2A] shrink-0">
        <div
          className={`flex items-end gap-2 bg-[#F7F7F5] dark:bg-[#2A2A2A] rounded-xl px-3 py-2 border border-transparent transition-colors ${
            isThinking
              ? "input-thinking"
              : "focus-within:border-[#0075de] dark:focus-within:border-[#4DA3E8]"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
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
  );
}
