import { useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (data: { reply: string; exam_paper?: unknown; documents_loaded?: string[] }) => void
  onError: (msg: string) => void
}

export function useChatStream() {
  const abortRef = useRef<AbortController | null>(null)

  const getThreadId = useCallback((key: string): string => {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = uuidv4()
    sessionStorage.setItem(key, id)
    return id
  }, [])

  const resetThreadId = useCallback((key: string): string => {
    const id = uuidv4()
    sessionStorage.setItem(key, id)
    return id
  }, [])

  const streamChat = useCallback(
    async (
      message: string,
      threadKey: string,
      { onToken, onDone, onError }: StreamCallbacks,
    ) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      let threadId = getThreadId(threadKey)

      const doStream = async (tid: string) => {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: tid, message }),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

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
              const jsonStr = line.slice(6)
              try {
                const data = JSON.parse(jsonStr)
                if (data.done) {
                  onDone(data)
                } else if (data.error) {
                  throw new Error(data.error)
                } else if (data.content) {
                  onToken(data.content)
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }
      }

      try {
        await doStream(threadId)
      } catch (err) {
        // On 500, retry with new thread
        if (err instanceof Error && err.message.includes('HTTP 5')) {
          threadId = resetThreadId(threadKey)
          try {
            await doStream(threadId)
          } catch (retryErr) {
            onError(
              retryErr instanceof TypeError
                ? '无法连接到后端。请确认服务已启动。'
                : `后端错误: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`
            )
          }
        } else if (err instanceof Error && err.name !== 'AbortError') {
          onError(
            err instanceof TypeError
              ? '无法连接到后端。请确认服务已启动。'
              : `后端错误: ${err.message}`
          )
        }
      }
    },
    [getThreadId, resetThreadId],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { streamChat, getThreadId, resetThreadId, abort }
}
