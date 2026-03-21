// 简单的前端唯一 ID 生成器（短且可读）
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateQuestionId(prefix = 'q'): string {
  const now = Date.now().toString(36).toUpperCase()
  let rand = ''
  for (let i = 0; i < 6; i++) rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return `${prefix}_${now}_${rand}`
}
