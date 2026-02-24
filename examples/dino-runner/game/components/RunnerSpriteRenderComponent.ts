import {
  CollisionEntity,
  RenderComponent,
  RenderLayer,
  Vector2D,
  fitRectContain,
  type ICamera,
} from "../lib.ts";
import type { RunnerEntity } from "../entities/RunnerEntity.ts";

type SpriteSet = {
  idle: HTMLImageElement;
  jump: HTMLImageElement;
  walkA: HTMLImageElement;
  walkB: HTMLImageElement;
  hit: HTMLImageElement;
};

export class RunnerSpriteRenderComponent extends RenderComponent<RunnerEntity> {
  private animationTime = 0;

  constructor(private readonly sprites: SpriteSet) {
    super(RenderLayer.World);
  }

  public override update(dt: number): void {
    super.update(dt);
    this.animationTime += dt;
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

    const sprite = this.pickSprite();
    const drawRect = fitRectContain(
      sprite.naturalWidth || sprite.width,
      sprite.naturalHeight || sprite.height,
      {
        x: topLeft.x,
        y: topLeft.y,
        width: bbox.width,
        height: bbox.height,
      },
    );
    // Characters should be visually grounded: preserve aspect ratio but pin feet to collider bottom.
    const groundedY = topLeft.y + bbox.height - drawRect.height;
    ctx.drawImage(sprite, drawRect.x, groundedY, drawRect.width, drawRect.height);
  }

  private pickSprite(): HTMLImageElement {
    if (this.ent.isDead) return this.sprites.hit;
    if (!this.ent.isGrounded(this.ent.groundY)) return this.sprites.jump;

    const frame = Math.floor(this.animationTime / 0.12) % 2;
    return frame === 0 ? this.sprites.walkA : this.sprites.walkB;
  }
}
