import { describe, test, expect } from "bun:test";
import * as rootApi from "./index.ts";
import * as srcApi from "./src/index.ts";

describe("public exports", () => {
  test("root index re-exports src API", () => {
    expect(rootApi.Entity).toBe(srcApi.Entity);
    expect(rootApi.EcsRuntime).toBe(srcApi.EcsRuntime);
    expect(rootApi.Component).toBe(srcApi.Component);
    expect(rootApi.BroadcastEventBus).toBe(srcApi.BroadcastEventBus);
    expect(rootApi.Vector2D).toBe(srcApi.Vector2D);
    expect(rootApi.TransformComponent).toBe(srcApi.TransformComponent);
    expect(rootApi.CollisionEntity).toBe(srcApi.CollisionEntity);
    expect(rootApi.RenderSystem).toBe(srcApi.RenderSystem);
    expect(rootApi.SceneManager).toBe(srcApi.SceneManager);
    expect(rootApi.InputManager).toBe(srcApi.InputManager);
    expect(rootApi.World).toBe(srcApi.World);
    expect(rootApi.PhysicsSystem).toBe(srcApi.PhysicsSystem);
    expect(rootApi.PhysicsBodyComponent).toBe(srcApi.PhysicsBodyComponent);
    expect(rootApi.AssetManager).toBe(srcApi.AssetManager);
    expect(rootApi.ObjectPool).toBe(srcApi.ObjectPool);
    expect(rootApi.EntityProfiler).toBe(srcApi.EntityProfiler);
  });

  test("key runtime exports are defined", () => {
    expect(typeof rootApi.Entity).toBe("function");
    expect(typeof rootApi.BroadcastEventBus).toBe("function");
    expect(typeof rootApi.GameEvent).toBe("function");
    expect(typeof rootApi.Vector2D).toBe("function");
    expect(typeof rootApi.noise1D).toBe("function");
    expect(typeof rootApi.World).toBe("function");
    expect(typeof rootApi.PhysicsSystem).toBe("function");
    expect(typeof rootApi.PhysicsBodyComponent).toBe("function");
    expect(typeof rootApi.AssetManager).toBe("function");
  });
});
