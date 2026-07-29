import PDFDocument from 'pdfkit'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'

await mkdir('data', { recursive: true })
const doc = new PDFDocument({ autoFirstPage: false })
const out = createWriteStream('data/验收样例.pdf')
doc.pipe(out)

const pages = [
  ['第一条要求', '第二条要求', '重复条款内容', '第四条要求', '第五条要求', '第六条要求', '第七条要求', '第八条要求'],
  ['第九条要求', '重复条款内容', '第十一条要求', '第十二条要求', '第十三条要求', '第十四条要求', '第十五条要求'],
  ['第十六条要求', '第十七条要求', '第十八条要求', '第十九条要求', '第二十条要求'],
]
for (const lines of pages) {
  doc.addPage()
  doc.fontSize(12)
  // CJK glyphs need a registered font; same one used by the test fixture
  doc.font('/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf')
  for (const line of lines) doc.text(line)
}
doc.end()
out.on('finish', () => console.log('已生成 data/验收样例.pdf（3 页 20 行）'))
