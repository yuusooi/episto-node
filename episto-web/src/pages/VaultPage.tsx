import { useEffect } from 'react'
import { useAppStore, findFileNode } from '../store'
import FilePreview from '../components/FilePreview'
import CommandCenter from '../components/CommandCenter'

// ============================================================
// Vault Page — file preview driven by activeFileId
// ============================================================

export default function VaultPage() {
  const activeFileId = useAppStore((s) => s.activeFileId)
  const fetchDocuments = useAppStore((s) => s.fetchDocuments)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // No file selected — show Agent Command Center dashboard
  if (!activeFileId) {
    return <CommandCenter />
  }

  // Find the file in the tree
  const file = findFileNode(activeFileId)

  if (!file || file.type !== 'file') {
    return <CommandCenter />
  }

  return (
    <div className="h-full flex flex-col">
      <FilePreview file={file} />
    </div>
  )
}
