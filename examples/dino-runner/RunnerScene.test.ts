import { describe, expect, test } from "bun:test";
import {
  EcsRuntime,
  EntityRegistry,
  PhysicsSystem,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  World,
  type ICanvas,
} from "../../index.ts";
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

const stepWorld = (world: World, totalTime: number, dt = 1 / 60): void => {
  const steps = Math.ceil(totalTime / dt);
  for (let i = 0; i < steps; i++) {
    world.step(dt);
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
  const makeWorld = (runtime: EcsRuntime, scene: RunnerScene): World => {
    const world = new World({ runtime, fixedDeltaTime: 1 / 120, maxSubSteps: 8 });
    world.addSystem({
      phase: SystemPhase.Simulation,
      tickMode: SystemTickMode.Fixed,
      update(dt) {
        scene.update(dt);
      },
    });
    world.addSystem(
      new PhysicsSystem({
        gravity: new Vector2D(0, 1400),
        velocityIterations: 8,
      }),
    );
    return world;
  };

  test("scene boots and score starts at zero", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);

    scene.awake();
    scene.startRunForTest();
    stepWorld(world, 0.5);

    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });

  test("jump input moves runner upward", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new RunnerScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);
    scene.awake();
    scene.startRunForTest();

    const before = scene.getRunnerPositionForTest().y;
    emit(handlers, "keydown", { key: "Space" });
    stepWorld(world, 0.1);
    const after = scene.getRunnerPositionForTest().y;

    expect(after).toBeLessThan(before);
    scene.destroy();
  });

  test("obstacles spawn over time", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);

    scene.awake();
    scene.startRunForTest();
    stepWorld(world, 1.5);

    expect(scene.getObstacleCount()).toBeGreaterThan(0);
    scene.destroy();
  });

  test("score increases when an obstacle is passed", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new RunnerScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);

    scene.awake();
    scene.startRunForTest();
    scene.spawnObstacleForTest(new Vector2D(20, 436), { width: 20, height: 28, speed: 0 });
    world.step(0.016);

    expect(scene.getScore()).toBe(1);
    scene.destroy();
  });

  test("collision triggers game over and restart resets", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new RunnerScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);
    scene.awake();
    scene.startRunForTest();

    scene.spawnObstacleForTest(scene.getRunnerPositionForTest());
    world.step(0.016);
    expect(scene.isGameOver()).toBe(true);

    emit(handlers, "keydown", { key: "r" });
    world.step(0.016);

    expect(scene.isGameOver()).toBe(false);
    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });
});
