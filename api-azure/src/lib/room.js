const Redis = require('ioredis');
const { WebPubSubServiceClient } = require('@azure/web-pubsub');
const crypto = require('crypto');

let _redis;
let _mem = null;
function redis() {
  const conn = process.env.RedisConnectionString;
  if (!conn) {
    if (!_mem) {
      // very small in-memory fallback store for local dev
      const map = new Map();
      _mem = {
        async hmset(key, obj) {
          const cur = (map.get(key) || {});
          map.set(key, { ...cur, ...obj });
        },
        async hgetall(key) { return map.get(key) || {}; },
        async hset(key, field, val) {
          const cur = (map.get(key) || {});
          cur[field] = val;
          map.set(key, cur);
        },
        async sadd(key, ...members) {
          const cur = new Set(map.get(key) || []);
          members.forEach(m => cur.add(m));
          map.set(key, Array.from(cur));
        },
        async smembers(key) { return map.get(key) || []; }
      };
    }
    return _mem;
  }
  if (!_redis) {
    _redis = new Redis(conn);
  }
  return _redis;
}

let _svc;
function getServiceClient() {
  if (!_svc) {
    _svc = new WebPubSubServiceClient(process.env.WebPubSubConnectionString, process.env.WEBPUBSUB_HUB);
  }
  return _svc;
}

function roomKey(room) { return `room:${room}`; }
function playersKey(room) { return `room:${room}:players`; }
function answersKey(room, qid) { return `room:${room}:answers:${qid}`; }
function activeRoomsKey() { return `rooms:active`; }

async function createRoom() {
  const code = crypto.randomBytes(3).toString('hex');
  await redis().hmset(roomKey(code), { phase: 'lobby', createdAt: Date.now() });
  await redis().sadd(activeRoomsKey(), code);
  return code;
}

async function getRoomState(room) {
  const [meta, players] = await Promise.all([
    redis().hgetall(roomKey(room)),
    redis().hgetall(playersKey(room))
  ]);
  return { meta, players: Object.values(players).map((s) => JSON.parse(s)) };
}

async function getPlayers(room) {
  const players = await redis().hgetall(playersKey(room));
  return Object.values(players).map((s) => JSON.parse(s));
}

async function setPlayer(room, player) {
  await redis().hset(playersKey(room), player.id, JSON.stringify(player));
}

async function getAnswers(room, qid) {
  const map = await redis().hgetall(answersKey(room, qid));
  const out = new Map();
  for (const [pid, s] of Object.entries(map)) {
    try { out.set(pid, JSON.parse(s)); } catch { /* ignore */ }
  }
  return out;
}

async function joinRoom(room, player) {
  await redis().hset(playersKey(room), player.id, JSON.stringify({ ...player, score: 0 }));
  const svc = getServiceClient();
  await svc.group(room).addUser(player.id);
}

async function submitAnswer(room, { playerId, qid, answer, ms }) {
  const key = answersKey(room, qid);
  await redis().hset(key, playerId, JSON.stringify({ answer, ms }));
  return { ok: true };
}
async function setRoomMeta(room, obj) {
  await redis().hmset(roomKey(room), obj);
}

async function getRoomMeta(room) {
  return await redis().hgetall(roomKey(room));
}

async function listActiveRooms() {
  return await redis().smembers(activeRoomsKey());
}

module.exports = { createRoom, getRoomState, getPlayers, setPlayer, joinRoom, submitAnswer, getAnswers, getServiceClient, setRoomMeta, getRoomMeta, listActiveRooms };
