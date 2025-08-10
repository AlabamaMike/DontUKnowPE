const { setRoomMeta } = require('../../lib/room');
const { selectQuestions } = require('../../lib/sql');
const { getServiceClient } = require('../../lib/room');
const RULES = require('../../lib/rules');

module.exports = async function (context, req) {
  const adminSecret = process.env.ADMIN_START_SECRET;
  if (adminSecret) {
    const provided = req.headers['x-admin-secret'] || (req.query && req.query.secret);
    if (!provided || provided !== adminSecret) {
      return { status: 401, body: { error: 'unauthorized' } };
    }
  }
  const { room } = context.bindingData;
  const svc = getServiceClient();
  const qs = await selectQuestions(1, [], ['tf','mc','num']);
  if (!qs.length) return { status: 400, body: { error: 'no_questions' } };
  const q = qs[0];
  const until = Date.now() + RULES.durations.answerWindowMs;
  await setRoomMeta(room, { phase: 'question', round: 1, qIndex: 0, until, currentQ: JSON.stringify(q), usedIds: JSON.stringify([q.id]) });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_open', q, until, round: 1, qIndex: 0 }));
  return { status: 200, body: { ok: true } };
}
