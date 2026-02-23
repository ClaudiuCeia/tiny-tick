import type { CollisionAnchor, CollisionShape } from "../CollisionShape.ts";
import { RectangleCollisionShape } from "./RectangleCollisionShape.ts";
import { CircleCollisionShape } from "./CircleCollisionShape.ts";
import type { Transform } from "../../transform/TransformComponent.ts";
import { Vector2D } from "../../math/Vector2D.ts";

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
    return { x: transform.position.x, y: transform.position.y, width: this.width, height: 10000 };
  }

  isCollidingWith(
    other: CollisionShape,
    transformA: Transform,
    _anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): boolean {
    const sampleY = (x: number): number =>
      transformA.position.y + this.getYAt(x - transformA.position.x);

    if (other instanceof RectangleCollisionShape) {
      const width = other.width * transformB.scale;
      const height = other.height * transformB.scale;
      if (anchorB === "center") {
        const l = transformB.position.x - width / 2;
        const r = transformB.position.x + width / 2;
        const bottom = transformB.position.y + height / 2;
        return bottom >= Math.min(sampleY(l), sampleY(r));
      } else {
        const l = transformB.position.x;
        const r = l + width;
        const bottom = transformB.position.y + height;
        return bottom >= Math.min(sampleY(l), sampleY(r));
      }
    }
    if (other instanceof CircleCollisionShape) {
      const radius = other.radius * transformB.scale;
      const centerX = anchorB === "center" ? transformB.position.x : transformB.position.x + radius;
      const centerY = anchorB === "center" ? transformB.position.y : transformB.position.y + radius;
      return centerY + radius >= sampleY(centerX);
    }
    return false;
  }

  containsPoint(
    point: { x: number; y: number },
    transform: Transform,
    _anchor: CollisionAnchor,
  ): boolean {
    const yAt = transform.position.y + this.getYAt(point.x - transform.position.x);
    return point.y <= yAt;
  }

  resize(..._args: number[]): void {
    throw new Error("CurveCollisionShape does not support resizing");
  }

  getCollisionNormal(
    other: CollisionShape,
    transformA: Transform,
    _anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): Vector2D | null {
    const sampleY = (x: number): number =>
      transformA.position.y + this.getYAt(x - transformA.position.x);

    if (other instanceof RectangleCollisionShape) {
      const width = other.width * transformB.scale;
      const height = other.height * transformB.scale;
      const centerX =
        anchorB === "center" ? transformB.position.x : transformB.position.x + width / 2;
      const bottomY =
        anchorB === "center" ? transformB.position.y + height / 2 : transformB.position.y + height;
      const penetration = bottomY - sampleY(centerX);
      if (penetration <= 0) return null;
      return new Vector2D(0, -penetration);
    }

    if (other instanceof CircleCollisionShape) {
      const radius = other.radius * transformB.scale;
      const centerX = anchorB === "center" ? transformB.position.x : transformB.position.x + radius;
      const centerY = anchorB === "center" ? transformB.position.y : transformB.position.y + radius;
      const penetration = centerY + radius - sampleY(centerX);
      if (penetration <= 0) return null;
      return new Vector2D(0, -penetration);
    }

    return null;
  }
}
