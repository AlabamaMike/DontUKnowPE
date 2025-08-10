const { getServiceClient, listActiveRooms, getRoomMeta, setRoomMeta } = require('../../lib/room');
const { selectTfQuestions } = require('../../lib/sql');

// NOTE: This is a minimal scaffold to broadcast a heartbeat and prepare for phase progression.
module.exports = async function (context, myTimer) {
  const svc = getServiceClient();
  const rooms = await listActiveRooms();
  const now = Date.now();
  for (const room of rooms) {
    const meta = await getRoomMeta(room);
    const phase = meta.phase || 'lobby';
    const until = Number(meta.until || 0);
    if (phase === 'lobby') continue; // start not implemented here
    if (until && now < until) continue;

    if (phase === 'question') {
      // move to reveal
      await setRoomMeta(room, { phase: 'reveal', until: now + 4000 });
      await svc.group(room).sendToAll(JSON.stringify({ type: 'reveal' }));
      continue;
    }
    if (phase === 'reveal') {
      // move to inter
      await setRoomMeta(room, { phase: 'inter', until: now + 2000 });
      await svc.group(room).sendToAll(JSON.stringify({ type: 'inter' }));
      continue;
    }
    if (phase === 'inter' || phase === 'betweenRounds') {
      // next question
      const used = JSON.parse(meta.usedIds || '[]');
      const qs = await selectTfQuestions(1, used);
      if (qs.length === 0) {
        await setRoomMeta(room, { phase: 'ended', until: 0 });
        await svc.group(room).sendToAll(JSON.stringify({ type: 'ended' }));
        continue;
      }
      const q = qs[0];
      const nextUsed = JSON.stringify([...(used||[]), q.id]);
      await setRoomMeta(room, { phase: 'question', until: now + 15000, currentQ: JSON.stringify(q), usedIds: nextUsed });
      await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_open', q }));
      continue;
    }
  }
};
