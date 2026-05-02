import { useLocation } from 'react-router-dom'
import {
  FileText,
  FileIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Clock,
  FolderPlus,
  FilePlus2,
  Trash2,
  Database,
  GraduationCap,
  ClipboardCheck,
  Pencil,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import { useAppStore, findFileNode, checkIsDescendant } from '../store'
import type { FileNode, TutorConversation } from '../types'

// ============================================================
// Contexts for drag-and-drop and rename communication
// ============================================================

interface DragState {
  draggedNodeId: string | null
  dropTargetId: string | null
  dropPosition: 'before' | 'inside' | 'after' | null
}

const DragContext = createContext<{
  dragState: DragState
  setDragState: React.Dispatch<React.SetStateAction<DragState>>
} | null>(null)

const RenameContext = createContext<(nodeId: string | null) => void>(() => {})

function useDragContext() {
  const ctx = useContext(DragContext)
  if (!ctx) throw new Error('useDragContext must be inside DragContext.Provider')
  return ctx
}

// ============================================================
// Context Menu — floating menu on right-click
// ============================================================

interface ContextMenuState {
  x: number
  y: number
  nodeId: string
  nodeType: 'file' | 'folder'
}

function ContextMenu({
  menu,
  onClose,
}: {
  menu: ContextMenuState
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const createFolder = useAppStore((s) => s.createFolder)
  const addFile = useAppStore((s) => s.addFile)
  const uploadDocument = useAppStore((s) => s.uploadDocument)
  const ingestDocument = useAppStore((s) => s.ingestDocument)
  const deleteNode = useAppStore((s) => s.deleteNode)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const toggleTutorPanel = useAppStore((s) => s.toggleTutorPanel)
  const tutorPanelOpen = useAppStore((s) => s.tutorPanelOpen)
  const startRename = useContext(RenameContext)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const isFolder = menu.nodeType === 'folder'
  const isFile = menu.nodeType === 'file'
  const parentId = isFolder ? menu.nodeId : null

  const handleNewNote = () => {
    const name = `未命名笔记.md`
    addFile(parentId, name, 'md', '')
    onClose()
  }

  const handleAddFiles = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.md,.pdf,.txt'
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      for (const file of files) {
        try {
          await uploadDocument(file)
        } catch (err) {
          console.error('Upload failed for', file.name, err)
        }
      }
    }
    input.click()
    onClose()
  }

  const handleNewFolder = () => {
    const name = '新建文件夹'
    createFolder(menu.nodeId, name)
    onClose()
  }

  const handleDelete = () => {
    deleteNode(menu.nodeId)
    onClose()
  }

  const handleRename = () => {
    startRename(menu.nodeId)
    onClose()
  }

  const handleAgentAction = async (action: string) => {
    setActiveFileId(menu.nodeId)
    if (!tutorPanelOpen) toggleTutorPanel()

    if (action === 'ingestor') {
      const file = findFileNode(menu.nodeId)
      if (file) {
        try {
          await ingestDocument(menu.nodeId, file.name)
        } catch (err) {
          console.error('Ingest failed:', err)
        }
      }
    }
    onClose()
  }

  // Position: keep in viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: menu.x,
    top: menu.y,
    zIndex: 9999,
  }

  const itemClass =
    'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors'

  return (
    <div
      ref={ref}
      style={style}
      className="min-w-[200px] bg-white dark:bg-[#2A2A2A] border border-[#E9E9E7] dark:border-[#3A3A3A] rounded-lg shadow-lg py-1 overflow-hidden"
    >
      {isFolder && (
        <>
          <button
            onClick={handleNewNote}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#F7F7F5] dark:hover:bg-[#3A3A3A]`}
          >
            <FilePlus2 className="w-3.5 h-3.5 text-[#0075de] dark:text-[#4DA3E8]" />
            新建笔记
          </button>
          <button
            onClick={handleNewFolder}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#F7F7F5] dark:hover:bg-[#3A3A3A]`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#a39e98] dark:text-[#7A7A7A]" />
            新建子文件夹
          </button>
          <button
            onClick={handleAddFiles}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#F7F7F5] dark:hover:bg-[#3A3A3A]`}
          >
            <Plus className="w-3.5 h-3.5 text-[#1aae39] dark:text-[#3CC754]" />
            导入文件…
          </button>
          <div className="my-1 border-t border-[#E9E9E7] dark:border-[#3A3A3A]" />
        </>
      )}

      {isFile && (
        <>
          <div className="px-3 py-1">
            <span className="text-[10px] font-semibold text-[#a39e98] dark:text-[#6B6B6B] uppercase tracking-wide">
              Agent 指令
            </span>
          </div>
          <button
            onClick={() => handleAgentAction('ingestor')}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#F0FDF4] dark:hover:bg-[#14352A]`}
          >
            <Database className="w-3.5 h-3.5 text-[#059669] dark:text-[#34D399]" />
            交由 Ingestor 重新向量化
          </button>
          <button
            onClick={() => handleAgentAction('tutor')}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#FEF9C3] dark:hover:bg-[#3D350A]`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#92400E] dark:text-[#FCD34D]" />
            让 Tutor 生成复习大纲
          </button>
          <button
            onClick={() => handleAgentAction('examiner')}
            className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2A3A]`}
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[#0075de] dark:text-[#4DA3E8]" />
            让 Examiner 根据此文件出题
          </button>
          <div className="my-1 border-t border-[#E9E9E7] dark:border-[#3A3A3A]" />
        </>
      )}

      <button
        onClick={handleRename}
        className={`${itemClass} text-[#37352F] dark:text-[#D3D3D3] hover:bg-[#F7F7F5] dark:hover:bg-[#3A3A3A]`}
      >
        <Pencil className="w-3.5 h-3.5 text-[#787774] dark:text-[#9B9B9B]" />
        重命名
      </button>

      <div className="my-1 border-t border-[#E9E9E7] dark:border-[#3A3A3A]" />

      <button
        onClick={handleDelete}
        className={`${itemClass} text-[#dd5b00] dark:text-[#E8864A] hover:bg-[#fef3ec] dark:hover:bg-[#3A2A1E]`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        删除
      </button>
    </div>
  )
}

// ============================================================
// Recursive Sidebar Item — Obsidian-style tree
// ============================================================

function SidebarItem({
  node,
  depth,
  onContextMenu,
  renamingId,
}: {
  node: FileNode
  depth: number
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void
  renamingId: string | null
}) {
  const expandedFolders = useAppStore((s) => s.expandedFolders)
  const toggleFolder = useAppStore((s) => s.toggleFolder)
  const activeFileId = useAppStore((s) => s.activeFileId)
  const setActiveFileId = useAppStore((s) => s.setActiveFileId)
  const renameNodeAction = useAppStore((s) => s.renameNode)
  const moveNodeAction = useAppStore((s) => s.moveNode)
  const { dragState, setDragState } = useDragContext()

  const startRename = useContext(RenameContext)

  // Rename state
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const isRenaming = renamingId === node.id

  const isFolder = node.type === 'folder'
  const isExpanded = expandedFolders.includes(node.id)
  const isActive = !isFolder && activeFileId === node.id

  // Auto-focus and select when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      setRenameValue(node.name)
      // Select name stem (before extension) for files
      const dotIndex = node.name.lastIndexOf('.')
      if (node.type === 'file' && dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [isRenaming, node.name, node.type])

  const confirmRename = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== node.name) {
      renameNodeAction(node.id, trimmed)
    }
    setRenameValue('')
    startRename(null) // exit rename mode
  }, [renameValue, node.id, node.name, renameNodeAction, startRename])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenameValue('')
      startRename(null)
    }
  }, [confirmRename, startRename])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    startRename(node.id)
  }, [node.id, startRename])

  const handleClick = useCallback(() => {
    if (isRenaming) return
    if (isFolder) {
      toggleFolder(node.id)
    } else {
      setActiveFileId(node.id)
    }
  }, [isRenaming, isFolder, node.id, toggleFolder, setActiveFileId])

  // ---- Drag handlers ----
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
    setDragState({ draggedNodeId: node.id, dropTargetId: null, dropPosition: null })
  }, [node.id, setDragState])

  const handleDragEnd = useCallback(() => {
    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null })
  }, [setDragState])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (dragState.draggedNodeId === node.id) return

    // Prevent circular nesting
    if (dragState.draggedNodeId && isFolder) {
      if (checkIsDescendant(node.id, dragState.draggedNodeId)) return
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let position: 'before' | 'inside' | 'after'
    if (y < height * 0.25) {
      position = 'before'
    } else if (y > height * 0.75) {
      position = 'after'
    } else {
      position = 'inside'
    }

    // Files can't accept "inside" drops
    if (!isFolder && position === 'inside') {
      position = y < height * 0.5 ? 'before' : 'after'
    }

    setDragState((prev) => ({
      ...prev,
      dropTargetId: node.id,
      dropPosition: position,
    }))

    e.dataTransfer.dropEffect = 'move'
  }, [dragState.draggedNodeId, isFolder, node.id, setDragState])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragState((prev) =>
        prev.dropTargetId === node.id
          ? { ...prev, dropTargetId: null, dropPosition: null }
          : prev
      )
    }
  }, [node.id, setDragState])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === node.id) return

    // Final circular nesting check
    if (isFolder && checkIsDescendant(node.id, draggedId)) return

    if (isFolder && dragState.dropPosition === 'inside') {
      moveNodeAction(draggedId, node.id)
    }
    // For before/after, just move to the same parent (sibling reorder)
    // This effectively moves to root or same parent level

    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null })
  }, [node.id, isFolder, dragState.dropPosition, moveNodeAction, setDragState])

  // ---- Visual feedback ----
  const isDragged = dragState.draggedNodeId === node.id
  const isDropTarget = dragState.dropTargetId === node.id
  const isDropInside = isDropTarget && dragState.dropPosition === 'inside' && isFolder
  const isDropBefore = isDropTarget && dragState.dropPosition === 'before'
  const isDropAfter = isDropTarget && dragState.dropPosition === 'after'

  return (
    <div>
      <div
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative"
      >
        {/* Drop indicator line — before */}
        {isDropBefore && (
          <div
            className="absolute left-0 right-0 h-[2px] bg-[#0075de] dark:bg-[#4DA3E8] z-10"
            style={{ top: 0, marginLeft: `${12 + depth * 16}px` }}
          />
        )}

        <button
          onClick={handleClick}
          onContextMenu={(e) => onContextMenu(e, node)}
          className={`w-full flex items-center gap-1.5 pr-3 text-left transition-colors relative group ${
            isDragged ? 'opacity-40' : ''
          } ${isDropInside ? 'bg-[rgba(0,117,222,0.08)] dark:bg-[rgba(77,163,232,0.08)]' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {/* Active indicator bar */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#0075de] dark:bg-[#4DA3E8] rounded-r" />
          )}

          {/* Folder chevron */}
          {isFolder && (
            <span className="shrink-0 text-[#a39e98] dark:text-[#6B6B6B]">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          )}

          {/* Icon */}
          {isFolder ? (
            isExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#a39e98] dark:text-[#7A7A7A] shrink-0" strokeWidth={1.5} />
            ) : (
              <Folder className="w-4 h-4 text-[#a39e98] dark:text-[#7A7A7A] shrink-0" strokeWidth={1.5} />
            )
          ) : node.fileType === 'pdf' ? (
            <FileIcon className="w-4 h-4 text-[#dd5b00] dark:text-[#E8864A] shrink-0" strokeWidth={1.5} />
          ) : (
            <FileText className="w-4 h-4 text-[#0075de] dark:text-[#4DA3E8] shrink-0" strokeWidth={1.5} />
          )}

          {/* Name — inline edit or display */}
          {isRenaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={confirmRename}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-[13px] leading-7 bg-transparent text-[#37352F] dark:text-[#D3D3D3] outline-none border-b border-[#0075de] dark:border-[#4DA3E8] py-0"
            />
          ) : (
            <span
              onDoubleClick={handleDoubleClick}
              className={`text-[13px] leading-7 truncate ${
                isActive
                  ? 'text-[#37352F] dark:text-[#D3D3D3] font-medium'
                  : 'text-[#787774] dark:text-[#9B9B9B] hover:text-[#37352F] dark:hover:text-[#D3D3D3]'
              }`}
            >
              {node.name}
            </span>
          )}

          {/* Hover background */}
          <div
            className={`absolute inset-0 -z-10 rounded transition-colors ${
              isActive
                ? 'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)]'
                : 'group-hover:bg-[#EFEFED] dark:group-hover:bg-[#2A2A2A]'
            }`}
          />
        </button>

        {/* Drop indicator line — after */}
        {isDropAfter && (
          <div
            className="absolute left-0 right-0 h-[2px] bg-[#0075de] dark:bg-[#4DA3E8] z-10"
            style={{ bottom: 0, marginLeft: `${12 + depth * 16}px` }}
          />
        )}
      </div>

      {/* Children */}
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <SidebarItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Vault File Tree
// ============================================================

function FileTree() {
  const fileTree = useAppStore((s) => s.fileTree)
  const moveNodeAction = useAppStore((s) => s.moveNode)
  const createFolder = useAppStore((s) => s.createFolder)
  const uploadDocument = useAppStore((s) => s.uploadDocument)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    draggedNodeId: null,
    dropTargetId: null,
    dropPosition: null,
  })
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null)

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    createFolder(null, name)
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id,
      nodeType: node.type,
    })
  }, [])

  const handleAddFileClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.md,.pdf,.txt'
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? [])
      for (const file of files) {
        try {
          await uploadDocument(file)
        } catch (err) {
          console.error('Upload failed for', file.name, err)
        }
      }
    }
    input.click()
  }

  // Root-level drop zone handler
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    // Only activate if not over a specific SidebarItem
    if (!dragState.dropTargetId && dragState.draggedNodeId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }, [dragState.dropTargetId, dragState.draggedNodeId])

  const handleRootDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId) {
      moveNodeAction(draggedId, null)
    }
    setDragState({ draggedNodeId: null, dropTargetId: null, dropPosition: null })
  }, [moveNodeAction])

  // Count total files
  const countFiles = (nodes: FileNode[]): number =>
    nodes.reduce(
      (acc, n) => acc + (n.type === 'file' ? 1 : 0) + (n.children ? countFiles(n.children) : 0),
      0,
    )

  return (
    <DragContext.Provider value={{ dragState, setDragState }}>
      <RenameContext.Provider value={setRenamingNodeId}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#a39e98] dark:text-[#6B6B6B] tracking-[0.0125em] uppercase">
              文件
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowNewFolder(true)}
                className="p-0.5 rounded text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#37352F] dark:hover:text-[#D3D3D3] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
                title="新建文件夹"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleAddFileClick}
                className="p-0.5 rounded text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#37352F] dark:hover:text-[#D3D3D3] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
                title="添加文件"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* New folder input */}
          {showNewFolder && (
            <div className="px-3 pb-1">
              <div className="flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-[#a39e98] dark:text-[#7A7A7A] shrink-0" strokeWidth={1.5} />
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder()
                    if (e.key === 'Escape') {
                      setShowNewFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  onBlur={() => {
                    if (newFolderName.trim()) handleCreateFolder()
                    else {
                      setShowNewFolder(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="文件夹名称..."
                  className="flex-1 text-[13px] bg-transparent text-[#37352F] dark:text-[#D3D3D3] placeholder-[#a39e98] dark:placeholder-[#6B6B6B] outline-none border-b border-[#0075de] dark:border-[#4DA3E8] py-0.5"
                />
              </div>
            </div>
          )}

          {/* Recursive tree */}
          <div
            className="flex-1 overflow-y-auto"
            onDragOver={handleRootDragOver}
            onDrop={handleRootDrop}
          >
            {fileTree.map((node) => (
              <SidebarItem
                key={node.id}
                node={node}
                depth={0}
                onContextMenu={handleContextMenu}
                renamingId={renamingNodeId}
              />
            ))}
          </div>

          {/* Footer count */}
          <div className="px-3 py-2 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
            <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
              {countFiles(fileTree)} 个文件
            </span>
          </div>

          {/* Context menu */}
          {contextMenu && (
            <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
          )}
        </div>
      </RenameContext.Provider>
    </DragContext.Provider>
  )
}

// ============================================================
// Assessments History
// ============================================================

function ExamHistoryList() {
  const examHistory = useAppStore((s) => s.examHistory)
  const viewingExamRecordId = useAppStore((s) => s.viewingExamRecordId)
  const currentExamRecordId = useAppStore((s) => s.currentExamRecordId)
  const viewExamRecord = useAppStore((s) => s.viewExamRecord)
  const [completedOpen, setCompletedOpen] = useState(true)
  const [incompleteOpen, setIncompleteOpen] = useState(true)

  const completed = examHistory.filter((e) => e.status === 'completed')
  const incomplete = examHistory.filter((e) => e.status === 'incomplete')

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-1">
        <span className="text-[12px] font-medium text-[#a39e98] dark:text-[#6B6B6B] tracking-[0.0125em] uppercase">
          历次评测
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {examHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <ClipboardCheck className="w-5 h-5 text-[#d4d4d0] dark:text-[#4A4A4A] mb-2" strokeWidth={1.2} />
            <p className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B] text-center">
              出卷后自动收录
            </p>
          </div>
        )}

        {/* Incomplete section */}
        {incomplete.length > 0 && (
          <div>
            <button
              onClick={() => setIncompleteOpen(!incompleteOpen)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#dd5b00] dark:text-[#E8864A] uppercase tracking-wide hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
            >
              {incompleteOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              未完成
              <span className="text-[10px] font-normal text-[#a39e98] dark:text-[#6B6B6B]">({incomplete.length})</span>
            </button>
            {incompleteOpen && incomplete.map((exam) => {
              const isActive = exam.id === currentExamRecordId
              return (
                <button
                  key={exam.id}
                  onClick={() => viewExamRecord(exam.id)}
                  className={`w-full text-left px-3 py-2 pl-6 transition-colors relative ${
                    isActive
                      ? 'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)]'
                      : 'hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#dd5b00] dark:bg-[#E8864A] rounded-r" />
                  )}
                  <p className="text-[13px] leading-[1.5] text-[#37352F] dark:text-[#D3D3D3] truncate">
                    {exam.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {exam.completedAt}
                    </span>
                    <span className="text-[10px] text-[#dd5b00] dark:text-[#E8864A]">继续答题</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Completed section */}
        {completed.length > 0 && (
          <div>
            <button
              onClick={() => setCompletedOpen(!completedOpen)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#1aae39] dark:text-[#3CC754] uppercase tracking-wide hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
            >
              {completedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              已完成
              <span className="text-[10px] font-normal text-[#a39e98] dark:text-[#6B6B6B]">({completed.length})</span>
            </button>
            {completedOpen && completed.map((exam) => {
              const isActive = exam.id === viewingExamRecordId
              return (
                <button
                  key={exam.id}
                  onClick={() => viewExamRecord(exam.id)}
                  className={`w-full text-left px-3 py-2 pl-6 transition-colors relative ${
                    isActive
                      ? 'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)]'
                      : 'hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#0075de] dark:bg-[#4DA3E8] rounded-r" />
                  )}
                  <p className="text-[13px] leading-[1.5] text-[#37352F] dark:text-[#D3D3D3] truncate">
                    {exam.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {exam.score && (
                      <span className="text-[11px] font-semibold text-[#1aae39] dark:text-[#3CC754]">
                        {exam.score}
                      </span>
                    )}
                    <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B] flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {exam.completedAt}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {examHistory.length > 0 && (
        <div className="px-3 py-2 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
          <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
            {examHistory.length} 次评测
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tutor Sessions — conversation list
// ============================================================

function ConversationItem({
  conv,
  isActive,
  isThinking,
  onSwitch,
  onDelete,
}: {
  conv: TutorConversation
  isActive: boolean
  isThinking: boolean
  onSwitch: () => void
  onDelete: () => void
}) {
  const time = new Date(conv.updatedAt).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <button
      onClick={onSwitch}
      className={`w-full text-left px-3 py-2.5 transition-colors relative group ${
        isActive
          ? 'bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.05)]'
          : 'hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A]'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-[#0075de] dark:bg-[#4DA3E8] rounded-r" />
      )}

      <div className="flex items-center gap-2">
        <div className="shrink-0">
          {isThinking ? (
            <Sparkles className="w-4 h-4 text-[#0075de] dark:text-[#4DA3E8] animate-pulse" strokeWidth={1.5} />
          ) : (
            <MessageSquare className="w-4 h-4 text-[#a39e98] dark:text-[#6B6B6B]" strokeWidth={1.5} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-[1.4] text-[#37352F] dark:text-[#D3D3D3] truncate">
            {conv.title || '新对话'}
          </p>
          <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
            {time}
            {conv.messages.length > 0 && ` · ${conv.messages.length} 条消息`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-0.5 rounded text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#dd5b00] dark:hover:text-[#E8864A] opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="删除对话"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </button>
  )
}

function TutorSessions() {
  const conversations = useAppStore((s) => s.tutorConversations)
  const activeId = useAppStore((s) => s.activeTutorConversationId)
  const createConversation = useAppStore((s) => s.createTutorConversation)
  const switchConversation = useAppStore((s) => s.switchTutorConversation)
  const deleteConversation = useAppStore((s) => s.deleteTutorConversation)
  const isThinking = useAppStore((s) => s.tutorIsThinking)

  const hasConversations = conversations.length > 0 || activeId

  return (
    <div className="flex flex-col h-full">
      {/* Header + 新建按钮 */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#a39e98] dark:text-[#6B6B6B] tracking-[0.0125em] uppercase">
          对话
        </span>
        <button
          onClick={createConversation}
          title="新建对话"
          className="p-0.5 rounded text-[#a39e98] dark:text-[#6B6B6B] hover:text-[#37352F] dark:hover:text-[#D3D3D3] hover:bg-[#EFEFED] dark:hover:bg-[#2A2A2A] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {!hasConversations && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <MessageSquare className="w-5 h-5 text-[#d4d4d0] dark:text-[#4A4A4A] mb-2" strokeWidth={1.2} />
            <p className="text-[12px] text-[#a39e98] dark:text-[#6B6B6B] text-center">
              输入问题开始对话
            </p>
          </div>
        )}

        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isActive={conv.id === activeId}
            isThinking={isThinking && conv.id === activeId}
            onSwitch={() => switchConversation(conv.id)}
            onDelete={() => deleteConversation(conv.id)}
          />
        ))}
      </div>

      {/* Footer */}
      {hasConversations && (
        <div className="px-3 py-2 border-t border-[#E9E9E7] dark:border-[#2A2A2A]">
          <span className="text-[11px] text-[#a39e98] dark:text-[#6B6B6B]">
            {conversations.length} 个对话
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// ContextSidebar — route-aware
// ============================================================

export default function ContextSidebar() {
  const location = useLocation()
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  if (sidebarCollapsed) return null

  return (
    <aside className="w-[240px] h-screen bg-[#F7F7F5] dark:bg-[#202020] shrink-0 overflow-hidden">
      {location.pathname === '/vault' && <FileTree />}
      {location.pathname === '/assessments' && <ExamHistoryList />}
      {location.pathname === '/tutor' && <TutorSessions />}
    </aside>
  )
}
