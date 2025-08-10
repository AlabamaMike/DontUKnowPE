const sql = require('mssql');

let pool;
async function getPool() {
  if (pool) return pool;
  const server = process.env.SQL_SERVER;
  const database = process.env.SQL_DATABASE;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;
  if (!server || !database || !user || !password) return null;
  pool = await sql.connect({
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  });
  return pool;
}

const fallback = [
  { id: 'tf1', kind: 'tf', text: 'The sky is blue.', answer_text: 'true' },
  { id: 'tf2', kind: 'tf', text: '2 + 2 equals 5.', answer_text: 'false' },
  { id: 'mc1', kind: 'mc', text: 'Which is a prime?', options_json: JSON.stringify(['4','6','7','8']), answer_text: '2' },
  { id: 'num1', kind: 'num', text: 'Pi rounded to 2 decimals?', answer_text: '3.14', tolerance: 0.01 }
];

function normalizeRow(r) {
  if (r.kind === 'tf') return { id: r.id, kind: 'tf', text: r.text, correct: String(r.answer_text).toLowerCase() === 'true' };
  if (r.kind === 'mc') {
    const opts = JSON.parse(r.options_json || '[]');
    const correct = Number(r.answer_text ?? 0);
    return { id: r.id, kind: 'mc', text: r.text, options: opts, correct };
  }
  return { id: r.id, kind: 'num', text: r.text, correct: Number(r.answer_text ?? 0), tolerance: Number(r.tolerance ?? 0) };
}

async function selectQuestions(count, excludeIds = [], kinds = ['tf','mc','num']) {
  const p = await getPool();
  if (!p) {
    const list = fallback.filter(q => kinds.includes(q.kind) && !excludeIds.includes(q.id)).sort(() => Math.random() - 0.5);
    return list.slice(0, count).map(normalizeRow);
  }
  const req = p.request();
  req.input('count', sql.Int, count);
  const exclude = excludeIds.length ? `AND id NOT IN (${excludeIds.map((_,i)=>'@id'+i).join(',')})` : '';
  const kindFilter = kinds && kinds.length ? `AND kind IN (${kinds.map((_,i)=>'@k'+i).join(',')})` : '';
  excludeIds.forEach((id, i) => req.input('id'+i, sql.VarChar, id));
  kinds.forEach((k, i) => req.input('k'+i, sql.VarChar, k));
  const res = await req.query(`SELECT TOP (@count) id, kind, text, options_json, answer_text, tolerance FROM questions WHERE 1=1 ${exclude} ${kindFilter} ORDER BY NEWID()`);
  return res.recordset.map(normalizeRow);
}

module.exports = { selectQuestions };
