import type { CollisionAnchor, CollisionShape } from "../CollisionShape.ts";
import type { Transform } from "../../transform/TransformComponent.ts";
import { Vector2D } from "../../math/Vector2D.ts";
import { RectangleCollisionShape } from "./RectangleCollisionShape.ts";
import { CurveCollisionShape } from "./CurveCollisionShape.ts";

export class CircleCollisionShape implements CollisionShape {
  constructor(public radius: number) {}

  private getCenter(transform: Transform, anchor: CollisionAnchor): Vector2D {
    const r = this.radius * transform.scale;
    if (anchor === "center") return transform.position.clone();
    return new Vector2D(transform.position.x + r, transform.position.y + r);
  }

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
      const cA = this.getCenter(transformA, anchorA);
      const cB = other.getCenter(transformB, anchorB);
      const dx = cA.x - cB.x;
      const dy = cA.y - cB.y;
      const radiusA = this.radius * transformA.scale;
      const radiusB = other.radius * transformB.scale;
      const radiusSum = radiusA + radiusB;
      return dx * dx + dy * dy < radiusSum * radiusSum;
    }
    if (other instanceof RectangleCollisionShape) {
      const cA = this.getCenter(transformA, anchorA);
      const rA = this.radius * transformA.scale;
      const rect = other.getAABB(transformB, anchorB);
      const closestX = Math.max(rect.x, Math.min(cA.x, rect.x + rect.width));
      const closestY = Math.max(rect.y, Math.min(cA.y, rect.y + rect.height));
      const dx = cA.x - closestX;
      const dy = cA.y - closestY;
      return dx * dx + dy * dy < rA * rA;
    }
    if (other instanceof CurveCollisionShape) {
      const cA = this.getCenter(transformA, anchorA);
      const rA = this.radius * transformA.scale;
      return cA.y + rA >= other.getYAt(cA.x);
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
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): Vector2D | null {
    if (other instanceof CircleCollisionShape) {
      const cA = this.getCenter(transformA, anchorA);
      const cB = other.getCenter(transformB, anchorB);
      const dx = cA.x - cB.x;
      const dy = cA.y - cB.y;
      const distSq = dx * dx + dy * dy;
      const rA = this.radius * transformA.scale;
      const rB = other.radius * transformB.scale;
      const overlap = rA + rB - Math.sqrt(distSq);
      if (overlap <= 0) return null;

      if (distSq === 0) {
        return new Vector2D(overlap, 0);
      }

      const dist = Math.sqrt(distSq);
      return new Vector2D((dx / dist) * overlap, (dy / dist) * overlap);
    }

    if (other instanceof RectangleCollisionShape) {
      const cA = this.getCenter(transformA, anchorA);
      const rA = this.radius * transformA.scale;
      const rect = other.getAABB(transformB, anchorB);

      const closestX = Math.max(rect.x, Math.min(cA.x, rect.x + rect.width));
      const closestY = Math.max(rect.y, Math.min(cA.y, rect.y + rect.height));
      const dx = cA.x - closestX;
      const dy = cA.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0) {
        const dist = Math.sqrt(distSq);
        const overlap = rA - dist;
        if (overlap <= 0) return null;
        return new Vector2D((dx / dist) * overlap, (dy / dist) * overlap);
      }

      // Center is inside/edge of rectangle: push along shallowest axis.
      const left = cA.x - rect.x;
      const right = rect.x + rect.width - cA.x;
      const top = cA.y - rect.y;
      const bottom = rect.y + rect.height - cA.y;
      const minX = Math.min(left, right);
      const minY = Math.min(top, bottom);

      if (minX < minY) {
        return new Vector2D(left < right ? -(rA + left) : rA + right, 0);
      }
      return new Vector2D(0, top < bottom ? -(rA + top) : rA + bottom);
    }

    if (other instanceof CurveCollisionShape) {
      const cA = this.getCenter(transformA, anchorA);
      const rA = this.radius * transformA.scale;
      const penetration = cA.y + rA - other.getYAt(cA.x);
      if (penetration <= 0) return null;
      return new Vector2D(0, -penetration);
    }

    return null;
  }
}
