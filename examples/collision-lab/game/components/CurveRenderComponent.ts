import {
  CollisionEntity,
  CurveCollisionShape,
  RenderComponent,
  RenderLayer,
  TransformComponent,
  Vector2D,
  type ICamera,
} from "../lib.ts";

export class CurveRenderComponent extends RenderComponent {
  constructor(
    private readonly width: number,
    private readonly color = "#4ecdc4",
  ) {
    super(RenderLayer.World);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    const transform = this.ent.getComponent(TransformComponent).globalTransform;
    const collider = this.ent.getChild(CollisionEntity);
    if (!collider || !(collider.shape instanceof CurveCollisionShape)) return;

    const shape = collider.shape;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= this.width; x += 8) {
      const worldX = transform.position.x + x;
      const worldY = transform.position.y + shape.getYAt(x);
      const point = camera.toCanvas(new Vector2D(worldX, worldY), canvasSize);
      if (x === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }
}
