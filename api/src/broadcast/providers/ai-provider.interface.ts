export interface AiProviderResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface IAiProvider {
  readonly providerName: string;
  readonly modelIdentifier: string;
  generateNarration(prompt: { system: string; user: string }): Promise<AiProviderResponse>;
}
