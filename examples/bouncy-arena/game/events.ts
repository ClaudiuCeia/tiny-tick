import { BroadcastEventBus } from "./lib.ts";

export type ArenaEventPayload = {
  enemy_killed: { score: number };
  player_damaged: { hp: number };
  game_over: { score: number };
  restart_requested: Record<string, never>;
};

export const createArenaEventBus = (): BroadcastEventBus<ArenaEventPayload> =>
  new BroadcastEventBus<ArenaEventPayload>();
