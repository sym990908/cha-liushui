import type { OcrBlock } from '../../types/ocr'
import { getConfidenceStyle } from '../../lib/confidenceStyle'

interface Props {
  blocks: OcrBlock[]
  naturalWidth: number
  naturalHeight: number
  selectedBlockId?: string
  hoveredBlockId?: string
  onSelectBlock: (blockId: string) => void
  onHoverBlock: (blockId: string | undefined) => void
}

function bboxArea(bbox: [number, number][]) {
  const xs = bbox.map(([x]) => x)
  const ys = bbox.map(([, y]) => y)
  return Math.max(0, Math.max(...xs) - Math.min(...xs)) * Math.max(0, Math.max(...ys) - Math.min(...ys))
}

export function BboxOverlay({
  blocks,
  naturalWidth,
  naturalHeight,
  selectedBlockId,
  hoveredBlockId,
  onSelectBlock,
  onHoverBlock,
}: Props) {
  if (!naturalWidth || !naturalHeight) return null

  // 小框在上，避免大框盖住小框导致点选无响应
  const ordered = [...blocks].sort((a, b) => bboxArea(b.bbox) - bboxArea(a.bbox))

  const select = (blockId: string, e: React.SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
    onSelectBlock(blockId)
  }

  return (
    <svg
      className="absolute left-0 top-0"
      width={naturalWidth}
      height={naturalHeight}
      style={{ pointerEvents: 'auto' }}
    >
      {ordered.map((block) => {
        if (block.bbox.length < 4) return null
        const isSelected = block.id === selectedBlockId
        const isHovered = block.id === hoveredBlockId
        const conf = getConfidenceStyle(block.score)
        const points = block.bbox.map(([x, y]) => `${x},${y}`).join(' ')

        return (
          <polygon
            key={block.id}
            data-ocr-bbox={block.id}
            data-no-pan=""
            points={points}
            fill={isSelected || isHovered ? conf.fill : `${conf.fill.replace(/[\d.]+\)$/, '0.08)')}`}
            stroke={isSelected ? '#2563eb' : conf.border}
            strokeWidth={isSelected ? 2.5 : 1.5}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              select(block.id, e)
            }}
            onClick={(e) => select(block.id, e)}
            onMouseEnter={() => onHoverBlock(block.id)}
            onMouseLeave={() => onHoverBlock(undefined)}
          />
        )
      })}
    </svg>
  )
}
