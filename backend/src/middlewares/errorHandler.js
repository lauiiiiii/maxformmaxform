export function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err.stack || err)

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: '请求体过大' } })
  }

  const status = err.status || 500
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? '服务器内部错误' : err.message
    }
  })
}

export function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '接口不存在' } })
}
