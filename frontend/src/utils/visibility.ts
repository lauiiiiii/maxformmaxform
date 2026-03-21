export type LogicOp = 'eq'|'neq'|'in'|'nin'|'includes'|'notIncludes'|'gt'|'gte'|'lt'|'lte'|'regex'|'overlap'
export type LogicCond = { qid:number; op:LogicOp; value:any }
export type VisibleWhen = LogicCond[][] // OR(groups) of AND(conds)

export interface QuestionLogic { visibleWhen?: VisibleWhen }
export interface QuestionLike {
  id: number
  required?: boolean
  title?: string
  logic?: QuestionLogic
  // 可选：为列表题型的每个选项附带逻辑
  options?: { value?: string; label?: string; visibleWhen?: VisibleWhen }[]
}

const toArr = (v:any)=> Array.isArray(v) ? v : (v==null?[]:[v])

export function evalCond(cond:LogicCond, answers:Record<number,any>) {
  const ans = answers[Number(cond.qid)]
  const { op, value } = cond
  switch (op) {
    case 'eq': return ans === value
    case 'neq': return ans !== value
    case 'in':  return toArr(value).includes(ans)
    case 'nin': return !toArr(value).includes(ans)
    case 'includes': return (Array.isArray(ans)?ans:[ans]).includes(value)
    case 'notIncludes': return !(Array.isArray(ans)?ans:[ans]).includes(value)
    case 'overlap': {
      const a = Array.isArray(ans) ? ans : (ans==null?[]:[ans])
      const b = toArr(value)
      return a.some(v => b.includes(v))
    }
    case 'gt': return Number(ans) > Number(value)
    case 'gte': return Number(ans) >= Number(value)
    case 'lt': return Number(ans) < Number(value)
    case 'lte': return Number(ans) <= Number(value)
    case 'regex': try { return new RegExp(String(value)).test(String(ans??'')) } catch { return false }
    default: return false
  }
}

export function isVisible(q:QuestionLike, answers:Record<number,any>) {
  const groups = q?.logic?.visibleWhen
  if (!groups || !Array.isArray(groups) || groups.length===0) return true
  return groups.some(group => Array.isArray(group) && group.length>0 && group.every(c=>evalCond(c, answers)))
}

export function applyVisibility(questions:QuestionLike[], answers:Record<number,any>) {
  const visible: Record<number, boolean> = {}
  for (const q of questions||[]) {
    const v = isVisible(q, answers)
    visible[q.id] = v
    if (!v) delete answers[q.id]
  }
  return visible
}

// 基于 answers 过滤某题的可见选项，返回可见 value 集合（字符串）
export function visibleOptionValues(q: QuestionLike, answers: Record<number, any>) {
  const vals = new Set<string>()
  const opts = Array.isArray(q?.options) ? q.options : []
  if (!opts.length) return vals
  const groupsOk = (groups?: VisibleWhen) => {
    if (!groups || !Array.isArray(groups) || groups.length===0) return true
    return groups.some(g => Array.isArray(g) && g.length>0 && g.every(c => evalCond(c as any, answers)))
  }
  opts.forEach((opt:any) => {
    if (groupsOk(opt?.visibleWhen)) vals.add(String(opt?.value ?? ''))
  })
  return vals
}
