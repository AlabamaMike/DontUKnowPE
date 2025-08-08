import { GAME_RULES } from './constants'
import type { Question } from './types'

type Player = { id: string; name: string; score: number; avgMs: number; answers: number }

type RoomState = {
  phase: 'lobby' | 'question' | 'reveal' | 'inter'
  round: 1 | 2 | 3
  qIndex: number
  players: Record<string, Player>
  usedQuestionIds: Set<string>
}

export class RoomLogic {
  state: RoomState
  constructor() {
    this.state = {
      phase: 'lobby',
      round: 1,
      qIndex: 0,
      players: {},
      usedQuestionIds: new Set(),
    }
  }
  join(id: string, name: string) {
    if (Object.keys(this.state.players).length >= GAME_RULES.maxPlayers) throw new Error('room full')
    this.state.players[id] = { id, name, score: 0, avgMs: 0, answers: 0 }
  }
  score(correct: boolean, ms: number, isLast: boolean) {
    if (!correct) return 0
    const base = isLast ? GAME_RULES.lastQuestionBonus : GAME_RULES.normalPoints
    const mult = this.state.round === 3 ? GAME_RULES.round3Multiplier : 1
    return base * mult
  }
}
