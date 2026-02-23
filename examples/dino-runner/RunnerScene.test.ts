import { describe, expect, test } from "bun:test";
import { EcsRuntime, EntityRegistry, Vector2D, type ICanvas } from "../../index.ts";
import { RunnerScene } from "./game/scenes/RunnerScene.ts";

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

  return { context: ctx, size: new Vector2D(900, 500) };
};

describe("dino-runner smoke", () => {
  test("scene boots and score starts at zero", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());

    scene.awake();
    scene.update(0.5);

    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });

  test("jump input moves runner upward", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new RunnerScene(runtime, makeCanvas());
    scene.awake();

    const before = scene.getRunnerPositionForTest().y;
    emit(handlers, "keydown", { key: "Space" });
    scene.update(0.016);
    const after = scene.getRunnerPositionForTest().y;

    expect(after).toBeLessThan(before);
    scene.destroy();
  });

  test("obstacles spawn over time", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());

    scene.awake();
    scene.update(1.5);

    expect(scene.getObstacleCount()).toBeGreaterThan(0);
    scene.destroy();
  });

  test("score increases when an obstacle is passed", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());

    scene.awake();
    scene.spawnObstacleForTest(new Vector2D(20, 436), { width: 20, height: 28, speed: 0 });
    scene.update(0.016);

    expect(scene.getScore()).toBe(1);
    scene.destroy();
  });

  test("collision triggers game over and restart resets", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new RunnerScene(runtime, makeCanvas());
    scene.awake();

    scene.spawnObstacleForTest(scene.getRunnerPositionForTest());
    scene.update(0.016);
    expect(scene.isGameOver()).toBe(true);

    emit(handlers, "keydown", { key: "r" });
    scene.update(0.016);

    expect(scene.isGameOver()).toBe(false);
    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });
});
