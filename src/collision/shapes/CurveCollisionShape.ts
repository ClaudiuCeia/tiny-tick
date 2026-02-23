import type { CollisionAnchor, CollisionShape } from "../CollisionShape.ts";
import { RectangleCollisionShape } from "./RectangleCollisionShape.ts";
import type { Transform } from "../../transform/TransformComponent.ts";
import type { Vector2D } from "../../math/Vector2D.ts";

/** Collision shape representing a curved surface defined by a height function. */
export class CurveCollisionShape implements CollisionShape {
  constructor(
    public getYAt: (x: number) => number,
    public width = 9999,
  ) {}

  getAABB(transform: Transform, _anchor: CollisionAnchor) {
    if (transform.rotation !== 0) {
      throw new Error("CurveCollisionShape does not support rotation");
    }
    if (transform.scale !== 1) {
      throw new Error("CurveCollisionShape does not support scaling");
    }
    return { x: transform.position.x, y: 0, width: this.width, height: 10000 };
  }

  isCollidingWith(
    other: CollisionShape,
    _transformA: Transform,
    _anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): boolean {
    if (other instanceof RectangleCollisionShape) {
      if (anchorB === "center") {
        const l = transformB.position.x - other.width / 2;
        const r = transformB.position.x + other.width / 2;
        const bottom = transformB.position.y + other.height / 2;
        return bottom >= Math.min(this.getYAt(l), this.getYAt(r));
      } else {
        const l = transformB.position.x;
        const r = l + other.width;
        const bottom = transformB.position.y + other.height;
        return bottom >= Math.min(this.getYAt(l), this.getYAt(r));
      }
    }
    return false;
  }

  containsPoint(
    point: { x: number; y: number },
    _transform: Transform,
    _anchor: CollisionAnchor,
  ): boolean {
    return point.y <= this.getYAt(point.x);
  }

  resize(..._args: number[]): void {
    throw new Error("CurveCollisionShape does not support resizing");
  }

  getCollisionNormal(
    _other: CollisionShape,
    _transformA: Transform,
    _anchorA: CollisionAnchor,
    _transformB: Transform,
    _anchorB: CollisionAnchor,
  ): Vector2D | null {
    throw new Error("CurveCollisionShape does not support getCollisionNormal");
  }
}
