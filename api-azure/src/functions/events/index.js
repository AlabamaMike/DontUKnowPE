const { WebPubSubServiceClient } = require('@azure/web-pubsub');
const { getRoomState, getPlayers, joinRoom, submitAnswer, getServiceClient } = require('../../lib/room');

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
      const { room, name, avatar } = payload;
      await joinRoom(room, { id: userId || connectionId, name, avatar, connectionId });
  const players = await getPlayers(room);
  await svc.group(room).sendToAll(JSON.stringify({ type: 'lobby', code: room, players: players.map(p=>({ id:p.id, name:p.name, score:p.score||0, avatar:p.avatar })) }));
      return { data: JSON.stringify({ type: 'ack', t: 'hello' }), dataType: 'json' };
    }
    case 'answer': {
      const { room, qid, answer, ms } = payload;
      const result = await submitAnswer(room, { playerId: userId || connectionId, qid, answer, ms });
      return { data: JSON.stringify({ type: 'ack', t: 'answer', result }), dataType: 'json' };
    }
    default:
      return { data: JSON.stringify({ type: 'error', error: 'unknown_type' }), dataType: 'json' };
  }
};
