import type { Transform } from "../transform/TransformComponent.ts";
import type { Vector2D } from "../math/Vector2D.ts";

export type CollisionAnchor = "center" | "top-left";

export interface CollisionShape {
  getAABB(
    transform: Transform,
    anchor: CollisionAnchor,
  ): { x: number; y: number; width: number; height: number };

  isCollidingWith(
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): boolean;

  containsPoint(point: Vector2D, transform: Transform, anchor: CollisionAnchor): boolean;

  resize(...args: number[]): void;

  /**
   * Returns the minimum-translation-vector (MTV) to push *this* out of `other`
   * in world-space, or null if no overlap. Normalize to get a collision normal.
   */
  getCollisionNormal(
    other: CollisionShape,
    transformA: Transform,
    anchorA: CollisionAnchor,
    transformB: Transform,
    anchorB: CollisionAnchor,
  ): Vector2D | null;
}
