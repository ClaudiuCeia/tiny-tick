import { describe, test, expect } from "bun:test";
import { GameEvent } from "./GameEvent.ts";

type Payload = {
  ping: { value: number };
  empty: Record<string, never>;
};

describe("GameEvent", () => {
  test("constructor stores type, payload and optional context", () => {
    const e = new GameEvent<Payload, "ping">("ping", { value: 42 }, "ctx-7");
    expect(e.type).toBe("ping");
    expect(e.payload).toEqual({ value: 42 });
    expect(e.contextId).toBe("ctx-7");
  });

  test("stopPropagation is idempotent", () => {
    const e = new GameEvent<Payload, "empty">("empty", {});
    expect(e.propagationStopped).toBe(false);
    e.stopPropagation();
    e.stopPropagation();
    expect(e.propagationStopped).toBe(true);
  });

  test("from creates equivalent event", () => {
    const e = GameEvent.from<Payload, "ping">({
      type: "ping",
      payload: { value: 9 },
      contextId: "ctx-x",
    });

    expect(e).toBeInstanceOf(GameEvent);
    expect(e.type).toBe("ping");
    expect(e.payload.value).toBe(9);
    expect(e.contextId).toBe("ctx-x");
  });
});
