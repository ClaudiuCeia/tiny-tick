import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { fitRectContain } from "../assets/sprite.ts";
import type { Entity } from "../ecs/Entity.ts";
import type { ICamera } from "./ICamera.ts";
import { RenderComponent } from "./RenderComponent.ts";
import { RenderLayer } from "./RenderLayer.ts";

type SpriteAlignX = "left" | "center" | "right";
type SpriteAlignY = "top" | "center" | "bottom";

export type SpriteRenderOptions<T extends Entity> = {
  sprite: (entity: T) => HTMLImageElement | null;
  zIndex?: RenderLayer;
  align?: { x?: SpriteAlignX; y?: SpriteAlignY };
};

export class SpriteRenderComponent<T extends Entity = Entity> extends RenderComponent<T> {
  private readonly readSprite: (entity: T) => HTMLImageElement | null;
  private readonly alignX: SpriteAlignX;
  private readonly alignY: SpriteAlignY;

  constructor(options: SpriteRenderOptions<T>) {
    super(options.zIndex ?? RenderLayer.World);
    this.readSprite = options.sprite;
    this.alignX = options.align?.x ?? "center";
    this.alignY = options.align?.y ?? "center";
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    const collider = this.ent.getChild(CollisionEntity);
    if (!collider) return;

    const sprite = this.readSprite(this.ent);
    if (!sprite) return;

    const bbox = collider.bbox();
    const topLeft = camera.toCanvas(new Vector2D(bbox.x, bbox.y), canvasSize);

    const fit = fitRectContain(
      sprite.naturalWidth || sprite.width,
      sprite.naturalHeight || sprite.height,
      {
        x: topLeft.x,
        y: topLeft.y,
        width: bbox.width,
        height: bbox.height,
      },
    );

    const drawX = this.computeAlignedAxis(topLeft.x, bbox.width, fit.width, this.alignX);
    const drawY = this.computeAlignedAxis(topLeft.y, bbox.height, fit.height, this.alignY);
    ctx.drawImage(sprite, drawX, drawY, fit.width, fit.height);
  }

  private computeAlignedAxis(
    start: number,
    total: number,
    size: number,
    align: SpriteAlignX | SpriteAlignY,
  ): number {
    const extra = total - size;
    if (align === "left" || align === "top") return start;
    if (align === "right" || align === "bottom") return start + extra;
    return start + extra / 2;
  }
}
