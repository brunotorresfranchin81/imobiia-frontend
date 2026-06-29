export class DataLayerError extends Error {
  constructor(
    public readonly context: string,
    public readonly cause: unknown
  ) {
    super(`[${context}] ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'DataLayerError'
    if (cause instanceof Error) this.stack = cause.stack
  }
}
