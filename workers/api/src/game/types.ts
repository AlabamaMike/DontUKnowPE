export type QuestionBase = {
  id: string
  category: string
  text: string
}
export type MultipleChoice = QuestionBase & { kind: 'mc'; options: string[]; answerIndex: number }
export type TrueFalse = QuestionBase & { kind: 'tf'; answer: boolean }
export type Numeric = QuestionBase & { kind: 'num'; answer: number; tolerance?: number }
export type Question = MultipleChoice | TrueFalse | Numeric
