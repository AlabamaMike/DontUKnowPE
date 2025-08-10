// Minimal constants for phases and timers
module.exports = {
  PHASES: {
    LOBBY: 'lobby',
    QUESTION: 'question',
    REVEAL: 'reveal',
    INTER: 'inter',
    BETWEEN: 'betweenRounds',
    ENDED: 'ended'
  },
  DURATIONS: {
    LOBBY_MIN: 0,
    QUESTION_MS: 15000,
    REVEAL_MS: 4000,
    INTER_MS: 2000,
    BETWEEN_MS: 3000
  }
};
