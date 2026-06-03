export function track(event: string, props?: Record<string, unknown>): void {
  try { console.log('[track]', event, props ?? {}); } catch { /* noop */ }
}
