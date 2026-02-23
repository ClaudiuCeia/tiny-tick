import type { Entity, AbstractComponent } from "../ecs/Entity.ts";
import type { Vector2D } from "../math/Vector2D.ts";

type Constructor<T> = AbstractComponent<T> | { new (...args: unknown[]): T };

/**
 * Minimal interface that RenderSystem and RenderComponent require from a camera.
 * Your game's CameraEntity must implement this interface.
 *
 * The `getChild` method is needed for frustum culling (isVisible checks whether
 * the entity's CollisionEntity overlaps with the camera's CollisionEntity).
 * The `toCanvas` method converts world-space positions to canvas pixels.
 */
export interface ICamera {
  getChild<C extends Entity>(constr: Constructor<C>): C | null;
  toCanvas(worldPos: Vector2D, canvasSize: Vector2D): Vector2D;
}
