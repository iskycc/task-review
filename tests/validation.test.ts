import { describe, it, expect } from 'vitest'
import { validateReviewInput } from '@/lib/validation'

describe('validateReviewInput', () => {
  it('rejects unknown status', () => {
    expect(validateReviewInput({ status: 'SKIP' })).toBe('无效的审核状态')
  })

  it('accepts PASSED without remark', () => {
    expect(validateReviewInput({ status: 'PASSED' })).toBeNull()
  })

  it('rejects DEFERRED with empty remark', () => {
    expect(validateReviewInput({ status: 'DEFERRED', remark: '   ' })).toBe('暂时遗留必须填写备注')
    expect(validateReviewInput({ status: 'DEFERRED' })).toBe('暂时遗留必须填写备注')
  })

  it('rejects remark over 2000 chars', () => {
    expect(validateReviewInput({ status: 'PASSED', remark: 'a'.repeat(2001) })).toBe('备注不能超过 2000 个字符')
  })

  it('accepts DEFERRED with valid remark', () => {
    expect(validateReviewInput({ status: 'DEFERRED', remark: '稍后确认' })).toBeNull()
  })
})
