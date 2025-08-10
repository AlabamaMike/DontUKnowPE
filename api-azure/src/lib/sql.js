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
  { id: 'tf3', kind: 'tf', text: 'Humans need water to live.', answer_text: 'true' }
];

async function selectTfQuestions(count, excludeIds = []) {
  const p = await getPool();
  if (!p) {
    const list = fallback.filter(q => !excludeIds.includes(q.id)).sort(() => Math.random() - 0.5);
    return list.slice(0, count).map(q => ({ id: q.id, kind: 'tf', text: q.text, correct: q.answer_text === 'true' }));
  }
  const req = p.request();
  req.input('count', sql.Int, count);
  const exclude = excludeIds.length ? `AND id NOT IN (${excludeIds.map((_,i)=>'@id'+i).join(',')})` : '';
  excludeIds.forEach((id, i) => req.input('id'+i, sql.VarChar, id));
  const res = await req.query(`SELECT TOP (@count) id, kind, text, answer_text FROM questions WHERE kind='tf' ${exclude} ORDER BY NEWID()`);
  return res.recordset.map(r => ({ id: r.id, kind: 'tf', text: r.text, correct: r.answer_text === 'true' }));
}

module.exports = { selectTfQuestions };
