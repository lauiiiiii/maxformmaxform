// 轻量9位数字编解码：用于将递增数字ID"混淆"为9位数字码
// 说明：这是前端层面的"防枚举"手段，不是强加密；生产可改为服务端随机 shareId 或 HMAC 限时签名。

// 两组混淆盐值，用于异或运算
const SALT1 = 123_456_789 // 第一组盐值
const SALT2 = 987_654_321 // 第二组盐值
const MULTIPLIER = 7_919   // 质数乘数，用于扩散
const OFFSET = 100_000_007 // 基础偏移，确保9位数字码编解码：用于将递增数字ID“混淆”为字母数字短码
// 说明：这是前端层面的“防枚举”手段，不是强加密；生产可改为服务端随机 shareId 或 HMAC 限时签名。

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' // 去除 0/O/I/l 等易混字符
const BASE = ALPHABET.length // 56
const SALT = 987_653 // 任意常量；可和后端约定

// 简单的可逆哈希函数
const simpleHash = (n: number): number => {
  // 使用线性同余生成器的思想，确保可逆性
  n = (n * MULTIPLIER + OFFSET) & 0x3FFFFFFF // 保持在30位内，避免溢出
  return n
}

// Base62字母表，用于生成高端的字母数字混合短码
const BASE62_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const BASE62 = BASE62_ALPHABET.length // 62

// 将数字编码为Base62字母数字短码
const toBase62 = (num: number): string => {
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

// 将Base62字母数字短码解码为数字
const fromBase62 = (str: string): number => {
  let result = 0
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const index = BASE62_ALPHABET.indexOf(char)
    if (index < 0) return NaN
    result = result * BASE62 + index
  }
  return result
}

// 将9位数字shareId编码为高端的字母数字短码（用于URL）
export const encodeShareIdToUrlCode = (shareId: string|number): string => {
  const n = Number(shareId)
  if (!Number.isFinite(n) || n <= 0) return String(shareId)
  
  // 增加一个大的偏移量，确保编码后至少8位
  const largeOffset = 0x7FFFFFFF // 大偏移量，约21亿
  // 异或混淆 + 大偏移量，确保结果足够大
  const scrambled = (n ^ 0x5A5A5A5A) + largeOffset
  
  const encoded = toBase62(scrambled)
  
  // 确保至少8位，不足则在前面补字符
  if (encoded.length < 8) {
    const padding = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const paddingNeeded = 8 - encoded.length
    let prefix = ''
    for (let i = 0; i < paddingNeeded; i++) {
      // 基于原始数字生成固定的前缀字符，保证可逆性
      const charIndex = ((n * 31 + i * 17) % padding.length)
      prefix += padding[charIndex]
    }
    return prefix + encoded
  }
  
  return encoded
}

// 将字母数字短码解码为9位数字shareId
export const decodeUrlCodeToShareId = (code: string): string | null => {
  if (!code || !/^[A-Za-z0-9]+$/.test(code)) return null
  
  const largeOffset = 0x7FFFFFFF // 与编码时相同的大偏移量
  
  // 如果是8位或更长，可能有前缀填充
  if (code.length >= 8) {
    // 尝试所有可能的前缀长度
    for (let prefixLen = 0; prefixLen <= code.length - 6; prefixLen++) {
      const actualCode = code.substring(prefixLen)
      const scrambled = fromBase62(actualCode)
      
      if (Number.isFinite(scrambled)) {
        // 减去大偏移量，然后异或解码
        const afterOffset = scrambled - largeOffset
        if (afterOffset > 0) {
          const shareId = afterOffset ^ 0x5A5A5A5A
          
          // 验证是否为有效的9位数字
          if (shareId >= 100_000_000 && shareId <= 999_999_999) {
            // 如果有前缀，验证前缀是否正确
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
  
  // 兼容旧的6位短码（无前缀填充）
  const scrambled = fromBase62(code)
  if (Number.isFinite(scrambled)) {
    const shareId = scrambled ^ 0x5A5A5A5A
    if (shareId >= 100_000_000 && shareId <= 999_999_999) {
      return shareId.toString()
    }
  }
  
  return null
}

// 注意：解码使用暴力搜索法，因为涉及模运算的逆运算比较复杂
// 在实际生产环境中，建议后端维护ID到ShareId的映射表来提升性能

export const encodeIdToCode = (id: string|number): string => {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return String(id)
  
  // 第一步：与第一个盐值异或
  let step1 = n ^ SALT1
  
  // 第二步：应用可逆哈希
  let step2 = simpleHash(step1)
  
  // 第三步：与第二个盐值异或
  let step3 = step2 ^ SALT2
  
  // 确保结果在9位数字范围内 (100,000,000 - 999,999,999)
  let result = (Math.abs(step3) % 900_000_000) + 100_000_000
  
  return result.toString()
}

export const decodeCodeToId = (code: string): number | null => {
  // 验证是否为9位数字
  if (!code || !/^\d{9}$/.test(code)) return null
  
  const encoded = Number(code)
  if (!Number.isFinite(encoded) || encoded < 100_000_000 || encoded > 999_999_999) {
    return null
  }
  
  // 使用暴力搜索法，在合理范围内查找原始ID
  // 对于问卷系统，ID通常不会超过100万
  for (let tryId = 1; tryId <= 1_000_000; tryId++) {
    if (encodeIdToCode(tryId) === code) {
      return tryId
    }
    
    // 优化：每100次检查一下是否应该提前退出
    if (tryId % 100 === 0 && tryId > 10000) {
      // 如果已经尝试了很多次仍未找到，可能这个code不是有效的
      // 但是我们继续，因为编码可能产生看起来很大的数字
    }
  }
  
  return null
}

export default { 
  encodeIdToCode, 
  decodeCodeToId, 
  encodeShareIdToUrlCode, 
  decodeUrlCodeToShareId 
}
