const { setRoomMeta } = require('../../lib/room');
const { selectTfQuestions } = require('../../lib/sql');
const { getServiceClient } = require('../../lib/room');
const RULES = require('../../lib/rules');

module.exports = async function (context, req) {
  const { room } = context.bindingData;
  const svc = getServiceClient();
  const qs = await selectTfQuestions(1, []);
  if (!qs.length) return { status: 400, body: { error: 'no_questions' } };
  const q = qs[0];
  await setRoomMeta(room, { phase: 'question', round: 1, qIndex: 0, until: Date.now() + RULES.durations.answerWindowMs, currentQ: JSON.stringify(q), usedIds: JSON.stringify([q.id]) });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_open', q }));
  return { status: 200, body: { ok: true } };
}
