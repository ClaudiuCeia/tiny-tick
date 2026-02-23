import { describe, test, expect, beforeEach } from "bun:test";
import { Entity } from "../ecs/Entity.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { RectangleCollisionShape } from "../collision/shapes/RectangleCollisionShape.ts";
import { CollisionRenderComponent } from "./CollisionRenderComponent.ts";
import type { ICamera } from "./ICamera.ts";
import { RenderLayer } from "./RenderLayer.ts";

class Owner extends Entity {}

class CameraStub extends Entity implements ICamera {
  toCanvas(worldPos: Vector2D): Vector2D {
    return new Vector2D(worldPos.x * 2, worldPos.y * 2);
  }
}

beforeEach(() => {
  EcsRuntime.reset();
});

describe("CollisionRenderComponent", () => {
  test("draws collider bbox and owner label", () => {
    const owner = new Owner();
    const collider = new CollisionEntity(new RectangleCollisionShape(10, 20));
    owner.addChild(collider);

    const comp = new CollisionRenderComponent(RenderLayer.HUD);
    collider.addComponent(comp);
    owner.awake();

    collider.getComponent(TransformComponent).setPosition(5, 6);

    const calls = {
      strokeRect: [] as number[][],
      fillRect: [] as number[][],
      fillText: [] as Array<[string, number, number]>,
    };

    const ctx = {
      strokeStyle: "",
      lineWidth: 0,
      fillStyle: "",
      font: "",
      textBaseline: "alphabetic",
      textAlign: "left",
      strokeRect: (...args: number[]) => calls.strokeRect.push(args),
      fillRect: (...args: number[]) => calls.fillRect.push(args),
      fillText: (text: string, x: number, y: number) => calls.fillText.push([text, x, y]),
    } as unknown as CanvasRenderingContext2D;

    const camera = new CameraStub();
    comp.doRender(ctx, camera, new Vector2D(1000, 1000));

    expect(calls.strokeRect).toEqual([[0, -8, 20, 40]]);
    expect(calls.fillRect).toEqual([]);
    expect(calls.fillText).toEqual([["Owner", 10, 52]]);
  });

  test("fills bbox when collider is colliding with player", () => {
    const collider = new CollisionEntity(new RectangleCollisionShape(4, 4), "top-left");
    const comp = new CollisionRenderComponent();
    collider.addComponent(comp);
    collider.awake();
    collider.isCollidingWithPlayer = true;

    const fillRectCalls: number[][] = [];
    const ctx = {
      strokeStyle: "",
      lineWidth: 0,
      fillStyle: "",
      font: "",
      textBaseline: "alphabetic",
      textAlign: "left",
      strokeRect: () => {},
      fillRect: (...args: number[]) => fillRectCalls.push(args),
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;

    comp.doRender(ctx, new CameraStub(), new Vector2D(1000, 1000));

    expect(fillRectCalls.length).toBe(1);
  });
});
