import { BroadcastEventBus } from "./lib.ts";

export type RunnerEventPayload = {
  runner_jumped: Record<string, never>;
  runner_landed: Record<string, never>;
  score_changed: { score: number };
  game_over: { score: number };
  restart_requested: Record<string, never>;
};

export const createRunnerEventBus = (): BroadcastEventBus<RunnerEventPayload> =>
  new BroadcastEventBus<RunnerEventPayload>();
