import { RenderLayer } from "./RenderLayer.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { Vector2D } from "../math/Vector2D.ts";
import type { ICamera } from "./ICamera.ts";

/**
 * Debug render component for CollisionEntity.
 * Draws the AABB in canvas space as a red rectangle.
 * Add this as a component on a CollisionEntity to visualise it.
 */
export class CollisionRenderComponent extends RenderComponent<CollisionEntity> {
  constructor(zIndex: number = RenderLayer.HUD) {
    super(zIndex);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    const bbox = this.ent.bbox();
    const topLeft = camera.toCanvas(new Vector2D(bbox.x, bbox.y), canvasSize);
    const bottomRight = camera.toCanvas(
      new Vector2D(bbox.x + bbox.width, bbox.y + bbox.height),
      canvasSize,
    );
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeft.x, topLeft.y, w, h);

    if (this.ent.isCollidingWithPlayer) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(topLeft.x, topLeft.y, w, h);
    }

    ctx.fillStyle = "red";
    ctx.font = "bold 16px Arial";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(
      this.ent.parent?.constructor.name ?? "Entity",
      topLeft.x + w / 2,
      topLeft.y + h + 20,
    );
  }
}
