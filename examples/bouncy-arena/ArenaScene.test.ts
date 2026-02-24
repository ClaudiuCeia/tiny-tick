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

  return { context: ctx, size: new Vector2D(800, 600) };
};

describe("bouncy-arena smoke", () => {
  const makeWorld = (runtime: EcsRuntime, scene: ArenaScene): World => {
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
        gravity: Vector2D.zero,
        velocityIterations: 6,
      }),
    );
    return world;
  };

  test("scene boots and updates", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new ArenaScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);

    scene.awake();
    world.step(0.016);

    expect(scene.getPlayerHp()).toBe(3);
    scene.destroy();
  });

  test("enemy spawns over time", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new ArenaScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);

    scene.awake();
    stepWorld(world, 1.0);

    expect(scene.getEnemyCount()).toBeGreaterThan(0);
    scene.destroy();
  });

  test("bullet collision increments score", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new ArenaScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);
    scene.awake();

    const playerPos = scene.getPlayerPositionForTest();
    scene.spawnEnemyForTest(playerPos.add(new Vector2D(24, 0)));

    emit(handlers, "keydown", { key: "ArrowRight" });
    emit(handlers, "keydown", { key: "Space" });

    world.step(0.016);

    expect(scene.getScore()).toBe(1);
    scene.destroy();
  });

  test("restart resets state after game over", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const handlers: HandlerMap = {};
    runtime.input.init(makeTarget(handlers));

    const scene = new ArenaScene(runtime, makeCanvas());
    const world = makeWorld(runtime, scene);
    scene.awake();

    scene.spawnEnemyForTest(new Vector2D(400, 300));
    scene.forceGameOverForTest();
    expect(scene.isGameOver()).toBe(true);

    emit(handlers, "keydown", { key: "r" });
    world.step(0.016);

    expect(scene.isGameOver()).toBe(false);
    expect(scene.getPlayerHp()).toBe(3);
    expect(scene.getScore()).toBe(0);
    scene.destroy();
  });
});
