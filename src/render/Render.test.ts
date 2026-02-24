import { describe, test, expect, beforeEach } from "bun:test";
import { Entity } from "../ecs/Entity.ts";
import { EntityRegistry } from "../ecs/EntityRegistry.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { RectangleCollisionShape } from "../collision/shapes/RectangleCollisionShape.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { HudRenderComponent } from "./HudRenderComponent.ts";
import { RenderLayer } from "./RenderLayer.ts";
import { RenderSystem } from "./RenderSystem.ts";
import type { ICamera } from "./ICamera.ts";

class Node extends Entity {}

class CameraEntity extends Entity implements ICamera {
  toCanvas(worldPos: Vector2D): Vector2D {
    return worldPos;
  }
}

abstract class LoggedRenderComponent extends RenderComponent<Node> {
  constructor(
    zIndex: RenderLayer,
    private label: string,
    private log: string[],
  ) {
    super(zIndex);
  }

  override doRender(): void {
    this.log.push(this.label);
  }
}

class WorldRenderComponent extends LoggedRenderComponent {
  constructor(zIndex: RenderLayer, label: string, log: string[]) {
    super(zIndex, label, log);
  }
}

class ForegroundRenderComponent extends LoggedRenderComponent {
  constructor(zIndex: RenderLayer, label: string, log: string[]) {
    super(zIndex, label, log);
  }
}

class BackgroundRenderComponent extends LoggedRenderComponent {
  constructor(zIndex: RenderLayer, label: string, log: string[]) {
    super(zIndex, label, log);
  }
}

class HudLoggedRenderComponent extends LoggedRenderComponent {
  constructor(zIndex: RenderLayer, label: string, log: string[]) {
    super(zIndex, label, log);
  }
}

class TestHudComponent extends HudRenderComponent<Node> {
  public rendered = 0;

  override doRender(): void {
    this.rendered++;
  }
}

class CanvasSizeProbeHudComponent extends HudRenderComponent<Node> {
  public seen: Vector2D | null = null;

  override doRender(_ctx: CanvasRenderingContext2D, _camera: ICamera, canvasSize: Vector2D): void {
    this.seen = canvasSize;
  }
}

beforeEach(() => {
  EcsRuntime.reset();
  (RenderSystem as unknown as { renderables: RenderComponent[] }).renderables = [];
  (globalThis as unknown as { window: { innerWidth: number; innerHeight: number } }).window = {
    innerWidth: 1280,
    innerHeight: 720,
  };
});

const createCtx = () => ({}) as CanvasRenderingContext2D;

describe("RenderComponent visibility", () => {
  test("returns false when entity is not awake", () => {
    const e = new Node();
    const rc = new WorldRenderComponent(RenderLayer.World, "x", []);
    e.addComponent(rc);

    const camera = new CameraEntity();
    expect(rc.isVisible(camera)).toBe(false);
  });

  test("HUD-layer components are visible without colliders", () => {
    const e = new Node();
    const hud = new HudLoggedRenderComponent(RenderLayer.HUD, "hud", []);
    e.addComponent(hud);
    e.awake();

    const camera = new CameraEntity();
    expect(hud.isVisible(camera)).toBe(true);
  });

  test("world components use collider overlap against camera collider", () => {
    const camera = new CameraEntity();
    const camCollider = new CollisionEntity(new RectangleCollisionShape(100, 100), "top-left");
    camera.addChild(camCollider);
    camera.awake();

    const owner = new Node();
    const ownerCollider = new CollisionEntity(new RectangleCollisionShape(10, 10), "top-left");
    owner.addChild(ownerCollider);
    const rc = new WorldRenderComponent(RenderLayer.World, "world", []);
    owner.addComponent(rc);
    owner.awake();

    ownerCollider.getComponent(TransformComponent).setPosition(5, 5);
    expect(rc.isVisible(camera)).toBe(true);

    ownerCollider.getComponent(TransformComponent).setPosition(200, 200);
    expect(rc.isVisible(camera)).toBe(false);
  });
});

describe("RenderSystem ordering and registration", () => {
  test("renders world in z-order then HUD", () => {
    const camera = new CameraEntity();
    const camCollider = new CollisionEntity(new RectangleCollisionShape(500, 500), "top-left");
    camera.addChild(camCollider);
    camera.awake();

    const owner = new Node();
    const ownerCollider = new CollisionEntity(new RectangleCollisionShape(50, 50), "top-left");
    owner.addChild(ownerCollider);

    const log: string[] = [];
    owner.addComponent(new ForegroundRenderComponent(RenderLayer.Foreground, "foreground", log));
    owner.addComponent(new BackgroundRenderComponent(RenderLayer.Background, "background", log));
    owner.addComponent(new WorldRenderComponent(RenderLayer.World, "world", log));
    owner.addComponent(new HudLoggedRenderComponent(RenderLayer.HUD, "hud", log));

    owner.awake();
    ownerCollider.getComponent(TransformComponent).setPosition(10, 10);

    const system = new RenderSystem({ context: createCtx(), size: new Vector2D(1, 1) }, camera);
    system.render();

    expect(log).toEqual(["background", "world", "foreground", "hud"]);
  });

  test("destroy unregisters render components", () => {
    const owner = new Node();
    owner.addComponent(new WorldRenderComponent(RenderLayer.World, "world", []));
    owner.awake();

    owner.destroy();

    const renderables = (RenderSystem as unknown as { renderables: RenderComponent[] }).renderables;
    expect(renderables).toHaveLength(0);
  });

  test("HudRenderComponent rejects zIndex below HUD", () => {
    expect(() => new TestHudComponent(RenderLayer.Foreground)).toThrow(
      "must be >= RenderLayer.HUD",
    );
  });

  test("renderables are isolated per runtime", () => {
    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    const log: string[] = [];

    const setup = (runtime: EcsRuntime, label: string) =>
      EcsRuntime.runWith(runtime, () => {
        const camera = new CameraEntity();
        const camCollider = new CollisionEntity(new RectangleCollisionShape(500, 500), "top-left");
        camera.addChild(camCollider);
        camera.awake();

        const owner = new Node();
        const ownerCollider = new CollisionEntity(new RectangleCollisionShape(10, 10), "top-left");
        owner.addChild(ownerCollider);
        owner.addComponent(new WorldRenderComponent(RenderLayer.World, label, log));
        owner.awake();
        ownerCollider.getComponent(TransformComponent).setPosition(0, 0);
        return camera;
      });

    const cameraA = setup(runtimeA, "A");
    const cameraB = setup(runtimeB, "B");

    new RenderSystem(
      { context: createCtx(), size: new Vector2D(1, 1) },
      cameraA,
      runtimeA,
    ).render();
    expect(log).toEqual(["A"]);

    log.length = 0;
    new RenderSystem(
      { context: createCtx(), size: new Vector2D(1, 1) },
      cameraB,
      runtimeB,
    ).render();
    expect(log).toEqual(["B"]);
  });

  test("passes actual canvas size to render components", () => {
    const camera = new CameraEntity();
    camera.awake();

    const owner = new Node();
    const probe = new CanvasSizeProbeHudComponent(RenderLayer.HUD);
    owner.addComponent(probe);
    owner.awake();

    const system = new RenderSystem({ context: createCtx(), size: new Vector2D(321, 123) }, camera);
    system.render();

    expect(probe.seen).toEqual(new Vector2D(321, 123));
  });
});
