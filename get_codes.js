// 测试获取问卷的8位短码
const encodeShareIdToUrlCode = (shareId) => {
  const n = Number(shareId)
  if (!Number.isFinite(n) || n <= 0) return String(shareId)
  
  const largeOffset = 0x7FFFFFFF
  const scrambled = (n ^ 0x5A5A5A5A) + largeOffset
  
  const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const BASE62 = BASE62_ALPHABET.length
  
  const toBase62 = (num) => {
    if (!Number.isFinite(num) || num <= 0) return 'A'
    let n = Math.floor(num)
    let result = ''
    while (n > 0) {
      const remainder = n % BASE62
      result = BASE62_ALPHABET[remainder] + result
      n = Math.floor(n / BASE62)
    }
    return result
  }
  
  const encoded = toBase62(scrambled)
  
  if (encoded.length < 8) {
    const padding = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const paddingNeeded = 8 - encoded.length
    let prefix = ''
    for (let i = 0; i < paddingNeeded; i++) {
      const charIndex = ((n * 31 + i * 17) % padding.length)
      prefix += padding[charIndex]
    }
    return prefix + encoded
  }
  
  return encoded
}

// 获取示例问卷的短码
const shareId1 = '576890626'
const shareId2 = '576930865' 
const code1 = encodeShareIdToUrlCode(shareId1)
const code2 = encodeShareIdToUrlCode(shareId2)

console.log("问卷1短码:", code1)
console.log("问卷2短码:", code2)
console.log("问卷1链接: http://localhost:63000/s/" + code1)
console.log("问卷2链接: http://localhost:63000/s/" + code2)
