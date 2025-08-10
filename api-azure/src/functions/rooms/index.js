const { createRoom } = require('../../lib/room');

module.exports = async function (context, req) {
  const code = await createRoom();
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { code }
  };
};
