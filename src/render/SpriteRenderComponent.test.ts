import { describe, expect, test } from "bun:test";
import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { RectangleCollisionShape } from "../collision/shapes/RectangleCollisionShape.ts";
import { Entity } from "../ecs/Entity.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import type { ICamera } from "./ICamera.ts";
import { SpriteRenderComponent } from "./SpriteRenderComponent.ts";

class Node extends Entity {}

class CameraEntity extends Entity implements ICamera {
  toCanvas(worldPos: Vector2D): Vector2D {
    return worldPos;
  }
}

describe("SpriteRenderComponent", () => {
  test("bottom-aligns sprite inside collider when configured", () => {
    const owner = new Node();
    const collider = new CollisionEntity(new RectangleCollisionShape(44, 64), "top-left");
    owner.addChild(collider);

    const image = {
      width: 128,
      height: 128,
      naturalWidth: 128,
      naturalHeight: 128,
    } as HTMLImageElement;

    const sprite = new SpriteRenderComponent<Node>({
      sprite: () => image,
      align: { y: "bottom" },
    });
    owner.addComponent(sprite);
    owner.awake();

    collider.getComponent(TransformComponent).setPosition(10, 20);

    const draws: Array<{ x: number; y: number; width: number; height: number }> = [];
    const ctx = {
      drawImage: (_img: HTMLImageElement, x: number, y: number, width: number, height: number) => {
        draws.push({ x, y, width, height });
      },
    } as unknown as CanvasRenderingContext2D;

    sprite.doRender(ctx, new CameraEntity(), new Vector2D(1024, 576));

    expect(draws).toHaveLength(1);
    expect(draws[0]).toEqual({
      x: 10,
      y: 40,
      width: 44,
      height: 44,
    });
  });
});
