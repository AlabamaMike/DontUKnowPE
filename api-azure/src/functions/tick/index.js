const { getServiceClient, listActiveRooms, getRoomMeta, setRoomMeta, getPlayers, getAnswers } = require('../../lib/room');
const { selectQuestions } = require('../../lib/sql');
const RULES = require('../../lib/rules');

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
      // scoring & reveal
      const q = meta.currentQ ? JSON.parse(meta.currentQ) : null;
      const answers = q ? await getAnswers(room, q.id) : new Map();
      const players = await getPlayers(room);
      const isLastInRound = Number(meta.qIndex || 0) >= (RULES.questionsPerRound - 1);
      const round = Number(meta.round || 1);
      const base = isLastInRound ? RULES.lastQuestionBonus : RULES.normalPoints;
      const mult = round === 3 ? RULES.round3Multiplier : 1;
      const perPlayer = [];
      for (const p of players) {
        const a = answers.get(p.id);
        let correct = false;
        if (a && q) {
          if (q.kind === 'tf') correct = Boolean(a.answer) === Boolean(q.correct);
          else if (q.kind === 'mc') correct = Number(a.answer) === Number(q.correct);
          else if (q.kind === 'num') correct = Math.abs(Number(a.answer) - Number(q.correct)) <= Number(q.tolerance || 0);
        }
        const ms = a?.ms || 0;
        const delta = correct ? base * mult : 0;
        const answersCount = (p.answers || 0) + (a ? 1 : 0);
        const avgMs = answersCount ? (((p.avgMs || 0) * (answersCount - 1) + ms) / answersCount) : (p.avgMs || 0);
        p.score = (p.score || 0) + delta;
        p.avgMs = avgMs;
        p.answers = answersCount;
        perPlayer.push({ id: p.id, correct, delta, score: p.score, ms });
      }
      // persist updated players
      // lightweight: we only broadcast reveal; players are persisted via joinRoom on change in this scaffold
  const untilReveal = now + RULES.durations.revealMs;
  await setRoomMeta(room, { phase: 'reveal', until: untilReveal });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'reveal', questionId: q?.id, correct: q?.correct, perPlayer, until: untilReveal, round, qIndex: Number(meta.qIndex || 0) }));
      continue;
    }
    if (phase === 'reveal') {
  // move to inter
  const untilInter = now + RULES.durations.interMs;
  await setRoomMeta(room, { phase: 'inter', until: untilInter });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'inter', until: untilInter, round: Number(meta.round || 1), qIndex: Number(meta.qIndex || 0) }));
      continue;
    }
    if (phase === 'inter' || phase === 'betweenRounds') {
      // next question or leaderboard/round transition
      const round = Number(meta.round || 1);
      const qIndex = Number(meta.qIndex || 0);
      if (qIndex >= (RULES.questionsPerRound - 1)) {
        // round done, show leaderboard and advance or end
        const players = await getPlayers(room);
        players.sort((a,b)=> (b.score||0) - (a.score||0) || (a.avgMs||0) - (b.avgMs||0));
        const untilBetween = now + (round < 3 ? RULES.durations.betweenMs : 0);
  await svc.group(room).sendToAll(JSON.stringify({ type: 'leaderboard', players: players.map(p=>({ id:p.id, name:p.name, score:p.score||0, avgMs:p.avgMs||0 })), top3: players.slice(0,3).map(p=>p.id), until: untilBetween, round }));
        if (round < 3) {
          await setRoomMeta(room, { phase: 'betweenRounds', until: untilBetween, qIndex: 0, round: round + 1 });
        } else {
          await setRoomMeta(room, { phase: 'ended', until: 0 });
          await svc.group(room).sendToAll(JSON.stringify({ type: 'ended' }));
        }
        continue;
      }
      const used = JSON.parse(meta.usedIds || '[]');
  const qs = await selectQuestions(1, used, ['tf','mc','num']);
      if (qs.length === 0) {
        await setRoomMeta(room, { phase: 'ended', until: 0 });
        await svc.group(room).sendToAll(JSON.stringify({ type: 'ended' }));
        continue;
      }
      const q = qs[0];
      const nextUsed = JSON.stringify([...(used||[]), q.id]);
  const untilAnswer = now + RULES.durations.answerWindowMs;
  await setRoomMeta(room, { phase: 'question', until: untilAnswer, currentQ: JSON.stringify(q), usedIds: nextUsed, qIndex: qIndex + 1, round });
  await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_open', q, until: untilAnswer, round, qIndex: qIndex + 1 }));
      continue;
    }
  }
};
