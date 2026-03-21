// 测试新的8位字母数字短码功能
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

const fromBase62 = (str) => {
  let result = 0
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const index = BASE62_ALPHABET.indexOf(char)
    if (index < 0) return NaN
    result = result * BASE62 + index
  }
  return result
}

const encodeShareIdToUrlCode = (shareId) => {
  const n = Number(shareId)
  if (!Number.isFinite(n) || n <= 0) return String(shareId)
  
  const largeOffset = 0x7FFFFFFF
  const scrambled = (n ^ 0x5A5A5A5A) + largeOffset
  
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

const decodeUrlCodeToShareId = (code) => {
  if (!code || !/^[A-Za-z0-9]+$/.test(code)) return null
  
  const largeOffset = 0x7FFFFFFF
  
  if (code.length >= 8) {
    for (let prefixLen = 0; prefixLen <= code.length - 6; prefixLen++) {
      const actualCode = code.substring(prefixLen)
      const scrambled = fromBase62(actualCode)
      
      if (Number.isFinite(scrambled)) {
        const afterOffset = scrambled - largeOffset
        if (afterOffset > 0) {
          const shareId = afterOffset ^ 0x5A5A5A5A
          
          if (shareId >= 100_000_000 && shareId <= 999_999_999) {
            if (prefixLen > 0) {
              const expectedPrefix = encodeShareIdToUrlCode(shareId).substring(0, prefixLen)
              if (code.startsWith(expectedPrefix)) {
                return shareId.toString()
              }
            } else {
              return shareId.toString()
            }
          }
        }
      }
    }
  }
  
  const scrambled = fromBase62(code)
  if (Number.isFinite(scrambled)) {
    const shareId = scrambled ^ 0x5A5A5A5A
    if (shareId >= 100_000_000 && shareId <= 999_999_999) {
      return shareId.toString()
    }
  }
  
  return null
}

// 测试编解码
console.log("=== 测试新8位字母数字短码编解码 ===")
const shareIds = ['576890626', '576930865', '576873760']
shareIds.forEach(shareId => {
  const urlCode = encodeShareIdToUrlCode(shareId)
  const decoded = decodeUrlCodeToShareId(urlCode)
  console.log(`ShareId: ${shareId} -> UrlCode: ${urlCode} (${urlCode.length}位) -> Decoded: ${decoded}`)
})
