import type { OcrBlock } from '../../types/ocr'
import { getBlockText } from '../../types/ocr'
import { getConfidenceStyle } from '../../lib/confidenceStyle'

function bboxBounds(bbox: [number, number][]) {
  const xs = bbox.map(([x]) => x)
  const ys = bbox.map(([, y]) => y)
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}

/** 按框宽/框高估算字号，避免中文末字被挤到下一行 */
function fitFontSize(text: string, width: number, height: number) {
  const lines = text.split('\n')
  const maxLineChars = Math.max(1, ...lines.map((line) => Array.from(line).length || 1))
  const byHeight = height * 0.88
  // CJK 近似方块字：字号约等于单字宽度
  const byWidth = width / maxLineChars
  return Math.max(8, Math.min(byHeight, byWidth, 36))
}

interface Props {
  blocks: OcrBlock[]
  naturalWidth: number
  naturalHeight: number
  selectedBlockId?: string
  hoveredBlockId?: string
  onSelectBlock: (blockId: string) => void
  onHoverBlock: (blockId: string | undefined) => void
  onEditBlock: (blockId: string, text: string) => void
}

export function OcrTextLayer({
  blocks,
  naturalWidth,
  naturalHeight,
  selectedBlockId,
  hoveredBlockId,
  onSelectBlock,
  onHoverBlock,
  onEditBlock,
}: Props) {
  if (blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl font-medium text-slate-500">
        暂无 OCR 结果
      </div>
    )
  }

  return (
    <div
      className="relative bg-white"
      style={{
        width: naturalWidth,
        height: naturalHeight,
        backgroundImage:
          'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      {blocks.map((block) => {
        if (block.bbox.length < 4) return null
        const { left, top, width, height } = bboxBounds(block.bbox)
        const style = getConfidenceStyle(block.score)
        const isSelected = block.id === selectedBlockId
        const isHovered = block.id === hoveredBlockId
        const text = getBlockText(block)
        const hasNewline = text.includes('\n')
        const fontSize = fitFontSize(text, width, height)

        return (
          <textarea
            key={block.id}
            value={text}
            onChange={(e) => onEditBlock(block.id, e.target.value)}
            onClick={() => onSelectBlock(block.id)}
            onFocus={() => onSelectBlock(block.id)}
            onMouseEnter={() => onHoverBlock(block.id)}
            onMouseLeave={() => onHoverBlock(undefined)}
            rows={1}
            className="absolute resize-none border outline-none"
            style={{
              left,
              top,
              width: Math.max(width, 24),
              height: Math.max(height, fontSize + 2),
              fontSize,
              lineHeight: 1,
              padding: 0,
              margin: 0,
              boxSizing: 'border-box',
              whiteSpace: hasNewline ? 'pre-wrap' : 'nowrap',
              overflow: 'hidden',
              color: style.text,
              backgroundColor: isSelected || isHovered ? style.fill : `${style.fill}`,
              borderColor: isSelected ? '#2563eb' : style.border,
              borderWidth: isSelected ? 2 : 1,
              zIndex: isSelected ? 10 : isHovered ? 5 : 1,
            }}
            title={`置信度 ${(block.score * 100).toFixed(0)}%`}
          />
        )
      })}
    </div>
  )
}
