const { WebPubSubServiceClient } = require('@azure/web-pubsub');
const { getRoomState, getPlayers, joinRoom, submitAnswer, getServiceClient, getAnswers } = require('../../lib/room');
const { validateHello, validateAnswer } = require('../../lib/validation');

module.exports = async function (context, data) {
  const hub = process.env.WEBPUBSUB_HUB;
  const request = context.bindingData.request;
  const { connectionId, userId } = request.connectionContext;

  let payload;
  try {
    payload = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    context.log('Invalid JSON payload');
    return { data: JSON.stringify({ type: 'error', error: 'invalid_json' }), dataType: 'json' };
  }

  const svc = getServiceClient();

  switch (payload.type) {
    case 'hello': {
      const parsed = validateHello(payload);
      if (!parsed.success) {
        context.log('hello validation failed', { errors: parsed.error.issues });
        return { data: JSON.stringify({ type: 'error', error: 'invalid_hello' }), dataType: 'json' };
      }
      const { room, name, avatar, role } = parsed.data;
      if (role === 'host') {
        // add host connection to room group for broadcasts
        await getServiceClient().group(room).addConnection(connectionId);
      }
      await joinRoom(room, { id: userId || connectionId, name, avatar, connectionId });
  const players = await getPlayers(room);
  await svc.group(room).sendToAll(JSON.stringify({ type: 'lobby', code: room, players: players.map(p=>({ id:p.id, name:p.name, score:p.score||0, avatar:p.avatar })) }));
      return { data: JSON.stringify({ type: 'ack', t: 'hello' }), dataType: 'json' };
    }
    case 'answer': {
      // input validation
      const parsed = validateAnswer(payload);
      if (!parsed.success) {
        context.log('answer validation failed', { errors: parsed.error.issues });
        return { data: JSON.stringify({ type: 'error', error: 'invalid_answer' }), dataType: 'json' };
      }
      const room = parsed.data.room;
      const qid = parsed.data.qid || parsed.data.questionId;
      const answer = typeof parsed.data.answer !== 'undefined' ? parsed.data.answer : parsed.data.payload;
      const ms = typeof parsed.data.ms === 'number' ? parsed.data.ms : (typeof parsed.data.at === 'number' ? (Date.now() - parsed.data.at) : 0);
      // simple rate limit per user per 5s to avoid floods
      try {
        const ipKey = `ratelimit:${room}:${userId || connectionId}`;
        const r = require('../../lib/room');
        const client = r.__rateRedis || (r.__rateRedis = r.__getRedis?.() || null);
        if (client && typeof client.incr === 'function') {
          const n = await client.incr(ipKey);
          if (n === 1 && typeof client.expire === 'function') await client.expire(ipKey, 5);
          if (n > 20) {
            return { data: JSON.stringify({ type: 'error', error: 'rate_limited' }), dataType: 'json' };
          }
        }
      } catch {}
      const result = await submitAnswer(room, { playerId: userId || connectionId, qid, answer, ms });
      try {
        const [answers, players] = await Promise.all([
          getAnswers(room, qid),
          getPlayers(room)
        ]);
        await svc.group(room).sendToAll(JSON.stringify({ type: 'answer_progress', qid, count: answers.size || 0, total: players.length || 0 }));
      } catch {}
      return { data: JSON.stringify({ type: 'ack', t: 'answer', result }), dataType: 'json' };
    }
    default:
      return { data: JSON.stringify({ type: 'error', error: 'unknown_type' }), dataType: 'json' };
  }
};
