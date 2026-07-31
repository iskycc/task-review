export interface PdfTextItem {
  str: string
  x: number
  y: number
}

export interface ExtractedLine {
  content: string
  pageNumber: number
  lineNumber: number
}

/**
 * Rebuilds visual lines from text items: sort by y desc (PDF origin is
 * bottom-left), then x asc; items within yTolerance of the previous line's y
 * belong to the same line; parts within a line join in x order.
 */
export function groupItemsIntoLines(items: PdfTextItem[], yTolerance = 3): string[] {
  const sorted = [...items]
    .filter((item) => item.str.length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: { y: number; parts: PdfTextItem[] }[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - item.y) <= yTolerance) {
      last.parts.push(item)
    } else {
      lines.push({ y: item.y, parts: [item] })
    }
  }
  return lines.map((line) =>
    line.parts
      .sort((a, b) => a.x - b.x)
      .map((part) => part.str)
      .join(''),
  )
}

/** Extracts valid text lines page by page: trimmed, blanks dropped, no dedup. */
export async function extractLines(pdfData: Uint8Array): Promise<ExtractedLine[]> {
  // PDF.js uses the emerging Math.sumPrecise API. Node 22/24 do not expose it
  // yet, so provide a compensated summation fallback before loading PDF.js.
  const math = Math as Math & { sumPrecise?: (values: Iterable<number>) => number }
  if (!math.sumPrecise) {
    math.sumPrecise = (values) => {
      let sum = 0
      let correction = 0
      for (const value of values) {
        const adjusted = value - correction
        const next = sum + adjusted
        correction = next - sum - adjusted
        sum = next
      }
      return sum
    }
  }
  const { getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(pdfData)
  try {
    const result: ExtractedLine[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const items: PdfTextItem[] = []
      for (const item of textContent.items) {
        if (!('str' in item)) continue
        items.push({ str: item.str, x: item.transform[4], y: item.transform[5] })
      }
      let lineNumber = 0
      for (const raw of groupItemsIntoLines(items)) {
        const content = raw.trim()
        if (!content) continue
        lineNumber += 1
        result.push({ content, pageNumber, lineNumber })
      }
    }
    return result
  } finally {
    // unpdf 1.8's proxy has no destroy(); teardown goes through the loading task.
    await pdf.loadingTask.destroy()
  }
}
