export class BroadcastTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`AI provider timed out after ${timeoutMs}ms`);
    this.name = 'BroadcastTimeoutError';
  }
}

export class BroadcastProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BroadcastProviderError';
  }
}

export class BroadcastValidationError extends Error {
  constructor(reason: string) {
    super(`Narration validation failed: ${reason}`);
    this.name = 'BroadcastValidationError';
  }
}
