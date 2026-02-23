import { describe, expect, test } from "bun:test";
import { EcsRuntime, EntityRegistry, Vector2D, type ICanvas } from "../../index.ts";
import { ArenaScene } from "./game/scenes/ArenaScene.ts";

type HandlerMap = Record<string, Array<(event: any) => void>>;

const makeTarget = (handlers: HandlerMap): EventTarget =>
  ({
    addEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      handlers[type] ??= [];
      handlers[type].push(fn as (event: any) => void);
    },
    removeEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      const list = handlers[type];
      if (!list) return;
      const idx = list.indexOf(fn as (event: any) => void);
      if (idx !== -1) list.splice(idx, 1);
    },
  }) as unknown as EventTarget;

const emit = (handlers: HandlerMap, type: string, event: any): void => {
  for (const fn of handlers[type] ?? []) {
    fn(event);
  }
};

const makeCanvas = (): ICanvas => {
  const ctx = {
    fillStyle: "",
    font: "",
    fillRect() {},
    fillText() {},
    clearRect() {},
  } as unknown as CanvasRenderingContext2D;

  return { context: ctx, size: new Vector2D(800, 600) };
};

describe("bouncy-arena smoke", () => {
  test("scene boots and updates", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new ArenaScene(runtime, makeCanvas());

    scene.awake();
    scene.update(0.016);

    expect(scene.getPlayerHp()).toBe(3);
    scene.destroy();
  });

  test("enemy spawns over time", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new ArenaScene(runtime, makeCanvas());

    scene.awake();
    scene.update(1.0);

    expect(scene.getEnemyCount()).toBeGreaterThan(0);
    scene.destroy();
  });

  test("bullet collision increments score", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new ArenaScene(runtime, makeCanvas());
    scene.awake();

    const playerPos = scene.getPlayerPositionForTest();
    scene.spawnEnemyForTest(playerPos.add(new Vector2D(24, 0)));

    emit(handlers, "keydown", { key: "ArrowRight" });
    emit(handlers, "keydown", { key: "Space" });

    scene.update(0.016);

    expect(scene.getScore()).toBe(1);
    scene.destroy();
  });

  test("restart resets state after game over", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new ArenaScene(runtime, makeCanvas());
    scene.awake();

    scene.spawnEnemyForTest(new Vector2D(400, 300));
    scene.forceGameOverForTest();
    expect(scene.isGameOver()).toBe(true);

    emit(handlers, "keydown", { key: "r" });
    scene.update(0.016);

    expect(scene.isGameOver()).toBe(false);
    expect(scene.getPlayerHp()).toBe(3);
    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });
});
