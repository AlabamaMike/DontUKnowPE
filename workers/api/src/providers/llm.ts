export interface LLMProvider {
  generateCommentary(prompt: string): Promise<string>
}

export class AzureOpenAI implements LLMProvider {
  constructor(private apiKey: string, private endpoint: string, private deployment: string = 'gpt-4o-mini') {}
  async generateCommentary(prompt: string): Promise<string> {
    // Stub: call Azure OpenAI
    return `Commentary: ${prompt.slice(0, 64)}…`
  }
}
