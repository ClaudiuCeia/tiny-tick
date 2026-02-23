import { describe, expect, test } from "bun:test";
import { EcsRuntime, EntityRegistry, Vector2D, type ICanvas } from "../../index.ts";
import { CollisionLabScene } from "./game/scenes/CollisionLabScene.ts";

const makeCanvas = (): ICanvas => {
  const ctx = {
    fillStyle: "",
    font: "",
    lineWidth: 1,
    beginPath() {},
    arc() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillRect() {},
    fillText() {},
    clearRect() {},
    fill() {},
  } as unknown as CanvasRenderingContext2D;

  return { context: ctx, size: new Vector2D(1000, 620) };
};

describe("collision-lab smoke", () => {
  test("scene boots and computes broadphase stats", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new CollisionLabScene(runtime, makeCanvas());

    scene.awake();
    scene.update(0.016);
    const snapshot = scene.getSnapshot();

    expect(snapshot.totalColliders).toBeGreaterThan(0);
    expect(snapshot.broadphasePairs).toBeGreaterThanOrEqual(0);
    expect(snapshot.collisionPairs).toBeGreaterThanOrEqual(0);

    scene.destroy();
  });

  test("layer/mask filtering removes overlapping hits", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const scene = new CollisionLabScene(runtime, makeCanvas());

    scene.awake();
    scene.clearBodiesForTest();

    scene.spawnBodyForTest("circle", new Vector2D(200, 80), 0b0001, 0b0010);
    scene.spawnBodyForTest("rect", new Vector2D(205, 80), 0b0100, 0b0001);

    scene.update(0.016);
    expect(scene.getSnapshot().collisionPairs).toBe(0);

    scene.destroy();
  });
});
