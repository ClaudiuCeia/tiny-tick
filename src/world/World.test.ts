import { describe, expect, test } from "bun:test";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { Entity } from "../ecs/Entity.ts";
import { EntityRegistry } from "../ecs/EntityRegistry.ts";
import { SystemPhase, SystemTickMode } from "./System.ts";
import { World } from "./World.ts";

describe("World", () => {
  test("runs fixed systems using fixed timestep and returns alpha", () => {
    const world = new World({ fixedDeltaTime: 0.02, maxSubSteps: 10 });
    const deltas: number[] = [];

    world.addSystem({
      tickMode: SystemTickMode.Fixed,
      phase: SystemPhase.Simulation,
      update(dt) {
        deltas.push(dt);
      },
    });

    const result = world.step(0.05);

    expect(deltas).toEqual([0.02, 0.02]);
    expect(result.fixedSteps).toBe(2);
    expect(result.alpha).toBeCloseTo(0.5, 5);
  });

  test("respects maxSubSteps limit", () => {
    const world = new World({ fixedDeltaTime: 0.01, maxSubSteps: 3 });
    let calls = 0;

    world.addSystem({
      tickMode: SystemTickMode.Fixed,
      update() {
        calls++;
      },
    });

    const result = world.step(1.0);
    expect(calls).toBe(3);
    expect(result.fixedSteps).toBe(3);
  });

  test("runs frame input before fixed and render after fixed with stable ordering", () => {
    const world = new World({ fixedDeltaTime: 0.01, maxSubSteps: 10 });
    const trace: string[] = [];

    world.addSystem({
      tickMode: SystemTickMode.Frame,
      phase: SystemPhase.Input,
      update() {
        trace.push("input");
      },
    });

    world.addSystem({
      tickMode: SystemTickMode.Fixed,
      phase: SystemPhase.Simulation,
      update() {
        trace.push("sim-1");
      },
    });

    world.addSystem({
      tickMode: SystemTickMode.Fixed,
      phase: SystemPhase.Simulation,
      update() {
        trace.push("sim-2");
      },
    });

    world.addSystem({
      tickMode: SystemTickMode.Frame,
      phase: SystemPhase.Render,
      update(_dt, _world, ctx) {
        trace.push(`render:${ctx.alpha.toFixed(2)}`);
      },
    });

    world.step(0.025);

    expect(trace).toEqual(["input", "sim-1", "sim-2", "sim-1", "sim-2", "render:0.50"]);
  });

  test("invokes awake and destroy lifecycle", () => {
    const world = new World();
    let awakeCalls = 0;
    let destroyCalls = 0;

    const system = {
      awake() {
        awakeCalls++;
      },
      destroy() {
        destroyCalls++;
      },
    };

    world.addSystem(system);
    expect(awakeCalls).toBe(1);

    expect(world.removeSystem(system)).toBe(true);
    expect(destroyCalls).toBe(1);

    expect(world.removeSystem(system)).toBe(false);
  });

  test("scopes execution to the world's runtime", () => {
    class RuntimeEntity extends Entity {
      public override update(_dt: number): void {}
    }

    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    EcsRuntime.runWith(runtimeB, () => {
      const world = new World({ runtime: runtimeA });

      world.addSystem({
        tickMode: SystemTickMode.Fixed,
        update() {
          new RuntimeEntity();
        },
      });

      world.step(0.02);
    });

    expect(runtimeA.registry.getEntitiesByType(RuntimeEntity)).toHaveLength(1);
    expect(runtimeB.registry.getEntitiesByType(RuntimeEntity)).toHaveLength(0);
  });
});
