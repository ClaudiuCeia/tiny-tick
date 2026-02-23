import type { CollisionAnchor, CollisionShape } from "../CollisionShape.ts";
import type { Transform } from "../../transform/TransformComponent.ts";
import { Vector2D } from "../../math/Vector2D.ts";
import { CircleCollisionShape } from "./CircleCollisionShape.ts";

export class RectangleCollisionShape implements CollisionShape {
  constructor(
    public width: number,
    public height: number,
  ) {}

  getAABB(transform: Transform, anchor: CollisionAnchor) {
    const w = this.width * transform.scale;
    const h = this.height * transform.scale;
    let x = transform.position.x;
    let y = transform.position.y;
    let aabbWidth = w;
    let aabbHeight = h;

    if (anchor === "center") {
      x -= w / 2;
      y -= h / 2;
    }

    if (transform.rotation !== 0) {
      const cos = Math.cos(transform.rotation);
      const sin = Math.sin(transform.rotation);
      const hw = w / 2;
      const hh = h / 2;
      x -= hw * cos - hh * sin;
      y -= hw * sin + hh * cos;
      aabbWidth = Math.abs(w * cos) + Math.abs(h * sin);
      aabbHeight = Math.abs(w * sin) + Math.abs(h * cos);
    }

    return { x, y, width: aabbWidth, height: aabbHeight };
  }

  isCollidingWith(
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): boolean {
    if (other instanceof RectangleCollisionShape) {
      const a = this.getAABB(transformA, anchorA);
      const b = other.getAABB(transformB, anchorB);
      return (
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
      );
    }
    return other.isCollidingWith(this, transformB, anchorB, transformA, anchorA);
  }

  containsPoint(point: Vector2D, transform: Transform, anchor: CollisionAnchor): boolean {
    const width = this.width * transform.scale;
    const height = this.height * transform.scale;
    let px = point.x - transform.position.x;
    let py = point.y - transform.position.y;

    if (transform.rotation !== 0) {
      const cos = Math.cos(-transform.rotation);
      const sin = Math.sin(-transform.rotation);
      const dx = px;
      const dy = py;
      px = dx * cos - dy * sin;
      py = dx * sin + dy * cos;
    }

    if (anchor === "center") {
      px += width / 2;
      py += height / 2;
    }

    return px >= 0 && px <= width && py >= 0 && py <= height;
  }

  resize(width: number, height?: number): void {
    this.width = width;
    if (height !== undefined) this.height = height;
  }

  /** Returns the MTV to push *this* out of `other` (rectangle only). */
  getCollisionNormal(
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): Vector2D | null {
    if (other instanceof CircleCollisionShape) {
      const mtvCircle = other.getCollisionNormal(this, transformB, anchorB, transformA, anchorA);
      return mtvCircle ? mtvCircle.negate() : null;
    }

    if (!(other instanceof RectangleCollisionShape)) return null;

    const aabbA = this.getAABB(transformA, anchorA);
    const aabbB = other.getAABB(transformB, anchorB);

    const cxA = aabbA.x + aabbA.width / 2;
    const cyA = aabbA.y + aabbA.height / 2;
    const cxB = aabbB.x + aabbB.width / 2;
    const cyB = aabbB.y + aabbB.height / 2;

    const dx = cxB - cxA;
    const dy = cyB - cyA;
    const halfW = (aabbA.width + aabbB.width) / 2;
    const halfH = (aabbA.height + aabbB.height) / 2;
    const overlapX = halfW - Math.abs(dx);
    const overlapY = halfH - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        return new Vector2D(dx > 0 ? -overlapX : overlapX, 0);
      } else {
        return new Vector2D(0, dy > 0 ? -overlapY : overlapY);
      }
    }

    return null;
  }
}
