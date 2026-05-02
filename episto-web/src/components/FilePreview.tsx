import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileIcon, Upload, Eye, Pencil } from 'lucide-react'
import { useAppStore } from '../store'
import type { FileNode } from '../types'

// ============================================================
// Markdown Preview — Notion-like typography
// ============================================================

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-preview max-w-3xl mx-auto px-10 py-8">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ============================================================
// Markdown Editor — raw textarea with toolbar
// ============================================================

function MarkdownEditor({ file }: { file: FileNode }) {
  const updateFileContent = useAppStore((s) => s.updateFileContent)
  const [localContent, setLocalContent] = useState(file.content ?? '')

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setLocalContent(val)
      updateFileContent(file.id, val)
    },
    [file.id, updateFileContent],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab inserts 2 spaces instead of moving focus
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const val = ta.value
      const next = val.substring(0, start) + '  ' + val.substring(end)
      setLocalContent(next)
      updateFileContent(file.id, next)
      // Restore cursor after React re-render
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
    // Ctrl/Cmd+S → prevent browser save, content already synced
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
    }
  }, [file.id, updateFileContent])

  return (
    <div className="flex-1 flex flex-col h-full">
      <textarea
        value={localContent}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="md-editor flex-1 w-full resize-none bg-transparent outline-none"
        spellCheck={false}
        placeholder="开始书写 Markdown..."
      />
    </div>
  )
}

// ============================================================
// PDF Viewer — embedded for real uploads, info for mock
// ============================================================

function PdfViewer({ file }: { file: FileNode }) {
  const content = file.content

  if (content && content.startsWith('data:')) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <embed
          src={content}
          type="application/pdf"
          className="flex-1 w-full"
          style={{ minHeight: 'calc(100vh - 120px)' }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-[#fef3ec] dark:bg-[#3A2A1E] flex items-center justify-center mb-4">
        <FileIcon className="w-8 h-8 text-[#dd5b00] dark:text-[#E8864A]" strokeWidth={1.2} />
      </div>
      <p className="text-[15px] font-medium text-[#37352F] dark:text-[#D3D3D3] mb-1">
        {file.name}
      </p>
      <p className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B] mb-4">
        此为示例 PDF 条目，暂无可预览的文件内容
      </p>
      <div className="flex items-center gap-1.5 text-[12px] text-[#a39e98] dark:text-[#6B6B6B]">
        <Upload className="w-3.5 h-3.5" />
        <span>通过右键文件夹 → 导入文件，上传真实 PDF 即可预览</span>
      </div>
    </div>
  )
}

// ============================================================
// Toolbar — edit/preview toggle + file name
// ============================================================

function EditorToolbar({
  fileName,
  isEditing,
  onToggle,
}: {
  fileName: string
  isEditing: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between px-10 py-2 border-b border-[#E9E9E7] dark:border-[#2A2A2A] shrink-0">
      <span className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B] truncate mr-4">
        {fileName}
      </span>
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
          isEditing
            ? 'text-[#0075de] dark:text-[#4DA3E8] bg-[#f2f9ff] dark:bg-[#1E2A3A]'
            : 'text-[#787774] dark:text-[#9B9B9B] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A]'
        }`}
        title={isEditing ? '切换到预览' : '切换到编辑'}
      >
        {isEditing ? (
          <>
            <Eye className="w-3.5 h-3.5" />
            预览
          </>
        ) : (
          <>
            <Pencil className="w-3.5 h-3.5" />
            编辑
          </>
        )}
      </button>
    </div>
  )
}

// ============================================================
// FilePreview — routes to correct renderer by fileType
// ============================================================

export default function FilePreview({ file }: { file: FileNode }) {
  const [isEditing, setIsEditing] = useState(false)

  // PDF — no edit capability
  if (file.fileType === 'pdf') {
    return <PdfViewer file={file} />
  }

  const content = file.content ?? ''

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Toolbar */}
      <EditorToolbar
        fileName={file.name}
        isEditing={isEditing}
        onToggle={() => setIsEditing((v) => !v)}
      />

      {/* Content */}
      {isEditing ? (
        <MarkdownEditor file={file} />
      ) : content ? (
        <MarkdownPreview content={content} />
      ) : (
        <div className="max-w-3xl mx-auto px-10 py-8">
          <p className="text-[13px] text-[#a39e98] dark:text-[#6B6B6B]">
            空白笔记 — 点击右上角「编辑」开始书写
          </p>
        </div>
      )}
    </div>
  )
}
