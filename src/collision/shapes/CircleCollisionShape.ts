import type { CollisionAnchor, CollisionShape } from "../CollisionShape.ts";
import type { Transform } from "../../transform/TransformComponent.ts";
import type { Vector2D } from "../../math/Vector2D.ts";

export class CircleCollisionShape implements CollisionShape {
  constructor(public radius: number) {}

  getAABB(transform: Transform, anchor: CollisionAnchor) {
    const r = this.radius * transform.scale;
    const { x, y } = transform.position;
    return anchor === "top-left"
      ? { x, y, width: r * 2, height: r * 2 }
      : { x: x - r, y: y - r, width: r * 2, height: r * 2 };
  }

  isCollidingWith(
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): boolean {
    if (other instanceof CircleCollisionShape) {
      const a = this.getAABB(transformA, anchorA);
      const b = other.getAABB(transformB, anchorB);
      const dx = a.x + a.width / 2 - (b.x + b.width / 2);
      const dy = a.y + a.height / 2 - (b.y + b.height / 2);
      const radiusA = this.radius * transformA.scale;
      const radiusB = other.radius * transformB.scale;
      const radiusSum = radiusA + radiusB;
      return dx * dx + dy * dy < radiusSum * radiusSum;
    }
    return other.isCollidingWith(this, transformB, anchorB, transformA, anchorA);
  }

  resize(radius: number): void {
    this.radius = radius;
  }

  containsPoint(
    point: { x: number; y: number },
    transform: Transform,
    anchor: CollisionAnchor,
  ): boolean {
    const r = this.radius * transform.scale;
    const px =
      anchor === "center" ? point.x - transform.position.x : point.x - (transform.position.x + r);
    const py =
      anchor === "center" ? point.y - transform.position.y : point.y - (transform.position.y + r);
    return px * px + py * py <= r * r;
  }

  getCollisionNormal(
    _other: CollisionShape,
    _transformA: Transform,
    _anchorA: CollisionAnchor,
    _transformB: Transform,
    _anchorB: CollisionAnchor,
  ): Vector2D | null {
    throw new Error("CircleCollisionShape does not support getCollisionNormal");
  }
}
