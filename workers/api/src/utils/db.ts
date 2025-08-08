export type DbQuestionRow = {
  id: string
  kind: 'mc' | 'tf' | 'num'
  text: string
  options_json?: string | null
  answer_text?: string | null
  tolerance?: number | null
}

export async function selectQuestions(db: D1Database, count: number, excludeIds: string[] = [], categoryIds: string[] = [], kinds: Array<'mc'|'tf'|'num'> = []) {
  // Build dynamic SQL safely; D1 supports positional binding
  const where: string[] = []
  const params: any[] = []
  if (categoryIds.length) {
    where.push(`category_id IN (${categoryIds.map(() => '?').join(',')})`)
    params.push(...categoryIds)
  }
  if (kinds.length) {
    where.push(`kind IN (${kinds.map(() => '?').join(',')})`)
    params.push(...kinds)
  }
  if (excludeIds.length) {
    where.push(`id NOT IN (${excludeIds.map(() => '?').join(',')})`)
    params.push(...excludeIds)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `SELECT id, kind, text, options_json, answer_text, tolerance FROM questions ${whereSql} ORDER BY RANDOM() LIMIT ?`
  params.push(count)
  const res = await db.prepare(sql).bind(...params).all<DbQuestionRow>()
  return res.results ?? []
}

export function normalizeQuestion(row: DbQuestionRow) {
  if (row.kind === 'tf') {
    return { id: row.id, kind: 'tf', text: row.text, correct: row.answer_text === 'true' }
  }
  if (row.kind === 'mc') {
    const opts = JSON.parse(row.options_json || '[]') as string[]
    const correctIndex = Number(row.answer_text ?? '0')
    return { id: row.id, kind: 'mc', text: row.text, options: opts, correct: correctIndex }
  }
  // numeric
  return { id: row.id, kind: 'num', text: row.text, correct: Number(row.answer_text ?? '0'), tolerance: Number(row.tolerance ?? 0) }
}
