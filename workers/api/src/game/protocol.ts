export type ClientHello = { type: 'hello'; role: 'host' | 'player'; name?: string; playerId?: string; avatar?: string }
export type ClientStart = { type: 'start' }
export type ClientAnswer = { type: 'answer'; playerId: string; questionId: string; payload: any; at?: number }
export type ClientMsg = ClientHello | ClientStart | ClientAnswer

export type ServerLobby = { type: 'lobby'; code: string; players: Array<{ id: string; name: string; score: number; avatar?: string }> }
export type ServerQuestion = { type: 'question'; q: { id: string; text: string; kind: string; options?: string[] }; revealAt: number }
export type ServerAnswerOpen = { type: 'answer_open'; q: any; closesAt: number }
export type ServerReveal = { type: 'reveal'; questionId: string; correct: any; perPlayer: Array<{ id: string; correct: boolean; delta: number; score: number; ms?: number }> }
export type ServerInter = { type: 'inter'; message: string; nextAt: number }
export type ServerBetweenRounds = { type: 'between_rounds'; round: number; nextAt: number }
export type ServerLeaderboard = { type: 'leaderboard'; players: Array<{ id: string; name: string; score: number; avgMs: number }>; top3: string[] }
export type ServerMsg = ServerLobby | ServerQuestion | ServerAnswerOpen | ServerReveal | ServerInter | ServerBetweenRounds | ServerLeaderboard
