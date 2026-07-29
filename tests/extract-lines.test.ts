import { describe, it, expect } from 'vitest'
import { groupItemsIntoLines, extractLines } from '@/lib/pdf/extract-lines'
import { createSamplePdfBuffer } from './helpers/sample-pdf'

describe('groupItemsIntoLines', () => {
  it('groups items by y with tolerance, orders by y desc then x asc', () => {
    const items = [
      { str: '右', x: 100, y: 700 },
      { str: '左', x: 50, y: 701 },   // same visual line as previous (within tolerance)
      { str: '下行', x: 50, y: 680 },
    ]
    expect(groupItemsIntoLines(items)).toEqual(['左右', '下行'])
  })

  it('keeps items in reading order within a line', () => {
    const items = [
      { str: 'world', x: 60, y: 100 },
      { str: 'hello ', x: 10, y: 100 },
    ]
    expect(groupItemsIntoLines(items)).toEqual(['hello world'])
  })
})

describe('extractLines', () => {
  it('extracts 20 ordered lines from a 3-page pdf with page and line numbers', async () => {
    const buffer = await createSamplePdfBuffer()
    const lines = await extractLines(new Uint8Array(buffer))
    expect(lines).toHaveLength(20)
    expect(lines[0]).toEqual({ content: '第一条要求', pageNumber: 1, lineNumber: 1 })
    expect(lines[2].content).toBe('重复条款内容')
    expect(lines[8].pageNumber).toBe(2)
    expect(lines[9].content).toBe('重复条款内容') // identical text is not deduplicated
    expect(lines[8].lineNumber).toBe(1)          // per-page line number restarts
    expect(lines[19]).toEqual({ content: '第二十条要求', pageNumber: 3, lineNumber: 5 })
  })

  it('trims leading/trailing whitespace and drops blank lines', async () => {
    const lines = await extractLines(
      new Uint8Array(await createSamplePdfBuffer()),
    )
    for (const line of lines) {
      expect(line.content).toBe(line.content.trim())
      expect(line.content.length).toBeGreaterThan(0)
    }
  })

  it('rejects on a corrupt pdf', async () => {
    await expect(extractLines(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow()
  })
})
