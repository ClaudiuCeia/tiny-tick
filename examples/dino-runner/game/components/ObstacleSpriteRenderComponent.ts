import {
  CollisionEntity,
  RenderComponent,
  RenderLayer,
  Vector2D,
  fitRectContain,
  type ICamera,
} from "../lib.ts";
import type { ObstacleEntity } from "../entities/ObstacleEntity.ts";

export class ObstacleSpriteRenderComponent extends RenderComponent<ObstacleEntity> {
  constructor(
    private readonly blockSprite: HTMLImageElement,
    private readonly stackCount: number,
  ) {
    super(RenderLayer.World);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    const collider = this.ent.getChild(CollisionEntity);
    if (!collider) return;

    const bbox = collider.bbox();
    const topLeft = camera.toCanvas(new Vector2D(bbox.x, bbox.y), canvasSize);

    const stack = Math.max(1, this.stackCount);
    const blockHeight = bbox.height / stack;

    for (let i = 0; i < stack; i++) {
      const target = {
        x: topLeft.x,
        y: topLeft.y + bbox.height - blockHeight * (i + 1),
        width: bbox.width,
        height: blockHeight,
      };

      const drawRect = fitRectContain(
        this.blockSprite.naturalWidth || this.blockSprite.width,
        this.blockSprite.naturalHeight || this.blockSprite.height,
        target,
      );

      ctx.drawImage(this.blockSprite, drawRect.x, drawRect.y, drawRect.width, drawRect.height);
    }
  }
}
