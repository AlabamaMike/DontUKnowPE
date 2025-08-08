export interface TTSProvider {
  synthesize(text: string, opts?: { voice?: string }): Promise<ArrayBuffer>
}

export class ElevenLabsTTS implements TTSProvider {
  constructor(private apiKey: string, private voiceId?: string) {}
  async synthesize(text: string): Promise<ArrayBuffer> {
    // Stub: integrate ElevenLabs API
    return new ArrayBuffer(0)
  }
}
