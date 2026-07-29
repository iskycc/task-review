import PDFDocument from 'pdfkit'

/** Generates a 3-page, 20-line text PDF (with two identical lines). */
export function createSamplePdfBuffer(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pages: string[][] = [
      ['第一条要求', '第二条要求', '重复条款内容', '第四条要求', '第五条要求', '第六条要求', '第七条要求', '第八条要求'],
      ['第九条要求', '重复条款内容', '第十一条要求', '第十二条要求', '第十三条要求', '第十四条要求', '第十五条要求'],
      ['第十六条要求', '第十七条要求', '第十八条要求', '第十九条要求', '第二十条要求'],
    ]
    for (const lines of pages) {
      doc.addPage()
      // pdfkit's default Helvetica has no CJK glyphs; register a fallback font
      // so the embedded text round-trips through extraction intact.
      doc.font('/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf')
      doc.fontSize(12)
      for (const line of lines) doc.text(line)
    }
    doc.end()
  })
}
