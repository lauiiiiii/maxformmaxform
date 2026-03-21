// HTML 相关工具：转义与简单安全过滤

// 转义基础文本为 HTML 文本节点
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 极简移除所有标签，只保留纯文本（用于兜底）
export function stripHtmlSimple(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '')
}

// 简单安全过滤：白名单常用内联标签；移除危险属性
export function safeHtml(html?: string): string {
  if (!html) return ''
  const allowed = new Set([
    'b','strong','i','em','u','s','span','p','br','ul','ol','li','blockquote','code','pre','a','img','h1','h2','h3','h4','h5','h6','hr','sub','sup','small','div','iframe','video','audio'
  ])
  const div = document.createElement('div')
  div.innerHTML = html

  const walker = (node: Node) => {
    if (node.nodeType === 1) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (!allowed.has(tag)) {
        // unwrap 节点
        const parent = el.parentNode
        while (el.firstChild) parent?.insertBefore(el.firstChild, el)
        parent?.removeChild(el)
        return
      }
      // 清理危险属性
      ;[...el.attributes].forEach(attr => {
        const name = attr.name.toLowerCase()
        const value = attr.value
        const isUrl = name === 'src' || name === 'href'
        const isSafeUrl = !isUrl || /^(https?:|data:image\/(png|jpeg|gif);base64,|#|\/)/i.test(value)
        const allowedAttrs = ['style','class','href','src','target','rel','title','alt','width','height','data-*']
        const inAllowList = allowedAttrs.some(a => a === name || (a.endsWith('*') && name.startsWith(a.slice(0, -1))))
        const isEvent = name.startsWith('on')
        if (!inAllowList || isEvent || !isSafeUrl) el.removeAttribute(attr.name)
      })

      // 额外安全与易用处理
      if (tag === 'a') {
        const href = el.getAttribute('href') || ''
        if (!/^https?:\/\//i.test(href)) el.removeAttribute('href')
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      }
      if (tag === 'iframe') {
        let src = el.getAttribute('src') || ''
        // 协议相对 //src 处理
        if (/^\/\//.test(src)) src = 'https:' + src
        // B站播放器参数兜底
        try {
          if (/player\.bilibili\.com/i.test(src)) {
            const u = new URL(src)
            if (!u.searchParams.has('autoplay')) u.searchParams.set('autoplay', '0')
            if (!u.searchParams.has('muted')) u.searchParams.set('muted', '0')
            src = u.toString()
          }
        } catch {}
        el.setAttribute('src', src)
        el.setAttribute('frameborder', '0')
        el.setAttribute('allowfullscreen', 'true')
        el.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
        el.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox')
        if (!el.getAttribute('width')) el.setAttribute('width', '100%')
        if (!el.getAttribute('height')) el.setAttribute('height', '240')
        el.classList.add('embed-video-frame')
      }
    }
    // 深度遍历（注意 childNodes 可能在 unwrap 后已变化）
    const children = Array.from(node.childNodes)
    children.forEach(walker)
  }
  Array.from(div.childNodes).forEach(walker)
  return div.innerHTML
}
