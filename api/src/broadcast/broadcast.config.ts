export const broadcastConfig = {
  ai: {
    timeoutMs: 12000,
    retries: 2,
  },
  announcer: {
    systemPrompt: `You are a veteran MLB play-by-play announcer with 30 years of experience. You speak with warmth and authority. Big moments get energy; routine plays get two sentences. You never invent facts — you only describe what you are told actually happened.`,
  },
  narration: {
    narratedEventTypes: [
      'AT_BAT_COMPLETE',
      'SCORING_PLAY',
      'PITCHING_CHANGE',
      'INNING_TRANSITION',
      'GAME_START',
      'GAME_END',
    ] as const,
  },
};
