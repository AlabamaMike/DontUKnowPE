const { z } = require('zod');

const HelloSchema = z.object({
  type: z.literal('hello'),
  room: z.string().min(1).max(16),
  role: z.enum(['host', 'player']),
  name: z.string().min(1).max(64).optional(),
  avatar: z.string().url().optional()
});

const AnswerSchema = z.object({
  type: z.literal('answer'),
  room: z.string().min(1).max(16),
  qid: z.string().min(1).or(z.undefined()),
  questionId: z.string().min(1).or(z.undefined()),
  answer: z.any().optional(),
  payload: z.any().optional(),
  ms: z.number().int().nonnegative().optional(),
  at: z.number().int().nonnegative().optional()
});

function validateHello(obj) {
  return HelloSchema.safeParse(obj);
}

function validateAnswer(obj) {
  return AnswerSchema.safeParse(obj);
}

module.exports = { validateHello, validateAnswer };
