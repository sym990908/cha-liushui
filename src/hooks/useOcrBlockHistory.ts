import { useCallback, useState } from 'react'
import type { OcrBlock } from '../types/ocr'

const MAX_HISTORY = 50

function cloneBlocks(blocks: OcrBlock[]): OcrBlock[] {
  return JSON.parse(JSON.stringify(blocks)) as OcrBlock[]
}

/** OCR 文本块编辑/删除的撤销重做（按页独立） */
export function useOcrBlockHistory() {
  const [past, setPast] = useState<OcrBlock[][]>([])
  const [future, setFuture] = useState<OcrBlock[][]>([])

  const pushSnapshot = useCallback((blocks: OcrBlock[]) => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), cloneBlocks(blocks)])
    setFuture([])
  }, [])

  const undo = useCallback(
    (current: OcrBlock[]): OcrBlock[] | null => {
      if (past.length === 0) return null
      const prev = past[past.length - 1]
      setPast((p) => p.slice(0, -1))
      setFuture((f) => [cloneBlocks(current), ...f])
      return prev
    },
    [past],
  )

  const redo = useCallback(
    (current: OcrBlock[]): OcrBlock[] | null => {
      if (future.length === 0) return null
      const next = future[0]
      setFuture((f) => f.slice(1))
      setPast((p) => [...p, cloneBlocks(current)])
      return next
    },
    [future],
  )

  const reset = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  return {
    pushSnapshot,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}
