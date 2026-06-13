import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import config from '../config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const UPLOAD_DIR = path.join(__dirname, '../../uploads')

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
  }
})

export function normalizeUploadedFileName(name) {
  const raw = String(name || '').trim()
  if (!raw) return ''
  if (!/[\u0080-\u00ff]/.test(raw)) return raw

  try {
    const decoded = Buffer.from(raw, 'latin1').toString('utf8')
    if (decoded && !decoded.includes('\uFFFD')) return decoded
  } catch {
    // Keep the original name when it is not latin1 mojibake.
  }

  return raw
}

function createUnsupportedFileTypeError() {
  const error = new Error('不支持的文件类型')
  error.status = 400
  error.code = 'UNSUPPORTED_FILE_TYPE'
  return error
}

export const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(createUnsupportedFileTypeError())
    }
  }
})

export const surveyUpload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize }
})

export function buildUploadedFileUrl(file) {
  return `/uploads/${file.filename}`
}

export function removeUploadedFile(fileOrUrl) {
  const filename = typeof fileOrUrl === 'string'
    ? path.basename(fileOrUrl)
    : path.basename(String(fileOrUrl?.path || fileOrUrl?.filename || fileOrUrl?.url || ''))

  if (!filename) return

  const targetPath = path.join(UPLOAD_DIR, filename)
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath)
  }
}

export function cleanupStoredFiles(files = []) {
  if (!Array.isArray(files) || files.length === 0) return

  for (const file of files) {
    try {
      removeUploadedFile(file?.url || file)
    } catch (error) {
      console.error('Failed to remove uploaded file:', error.message)
    }
  }
}
