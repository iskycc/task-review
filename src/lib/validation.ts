import { REMARK_MAX_LENGTH } from './config'

export type ReviewStatus = 'PENDING' | 'PASSED' | 'DEFERRED'

export interface ReviewInput {
  status: string
  remark?: string
}

/** Returns the error message, or null when the input is valid. */
export function validateReviewInput(input: ReviewInput): string | null {
  if (input.status !== 'PENDING' && input.status !== 'PASSED' && input.status !== 'DEFERRED') {
    return '无效的审核状态'
  }
  if (input.remark !== undefined && input.remark.length > REMARK_MAX_LENGTH) {
    return '备注不能超过 2000 个字符'
  }
  if (input.status === 'DEFERRED') {
    if (input.remark === undefined || input.remark.trim().length === 0) {
      return '暂时遗留必须填写备注'
    }
  }
  return null
}
