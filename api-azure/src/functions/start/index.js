const { setRoomMeta } = require('../../lib/room');
const { selectTfQuestions } = require('../../lib/sql');
const { getServiceClient } = require('../../lib/room');

module.exports = async function (context, req) {
  const { room } = context.bindingData;
  const svc = getServiceClient();
  const qs = await selectTfQuestions(1, []);
  if (!qs.length) return { status: 400, body: { error: 'no_questions' } };
  const q = qs[0];
  await setRoomMeta(room, { phase: 'question', until: Date.now() + 15000, currentQ: JSON.stringify(q), usedIds: JSON.stringify([q.id]) });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_open', q }));
  return { status: 200, body: { ok: true } };
}
