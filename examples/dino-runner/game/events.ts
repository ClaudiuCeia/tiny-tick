import { BroadcastEventBus } from "./lib.ts";

export type RunnerEventPayload = {
  score_changed: { score: number };
  game_over: { score: number };
  restart_requested: Record<string, never>;
};

export const createRunnerEventBus = (): BroadcastEventBus<RunnerEventPayload> =>
  new BroadcastEventBus<RunnerEventPayload>();
