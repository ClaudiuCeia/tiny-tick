export class GameEvent<TPayload, T extends keyof TPayload> {
  public propagationStopped = false;

  constructor(
    public type: T,
    public payload: TPayload[T],
    public contextId?: string,
  ) {}

  public stopPropagation(): void {
    this.propagationStopped = true;
  }

  public static from<TPayload, T extends keyof TPayload>(args: {
    type: T;
    payload: TPayload[T];
    contextId: string;
  }): GameEvent<TPayload, T> {
    return new GameEvent(args.type, args.payload, args.contextId);
  }
}
