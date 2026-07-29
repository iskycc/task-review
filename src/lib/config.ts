export const PDF_MAX_SIZE_MB = Number(process.env.PDF_MAX_SIZE_MB ?? 20)
export const PDF_MAX_SIZE_BYTES = PDF_MAX_SIZE_MB * 1024 * 1024
export const REMARK_MAX_LENGTH = 2000
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'data/uploads'
export const TASK_CREATE_BATCH_SIZE = 500
