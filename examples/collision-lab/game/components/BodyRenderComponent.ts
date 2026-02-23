import {
  CircleCollisionShape,
  CollisionEntity,
  RectangleCollisionShape,
  RenderComponent,
  RenderLayer,
  TransformComponent,
  Vector2D,
  type ICamera,
} from "../lib.ts";

export class BodyRenderComponent extends RenderComponent {
  constructor(private readonly color: string) {
    super(RenderLayer.World);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    camera: ICamera,
    canvasSize: Vector2D,
  ): void {
    const collider = this.ent.getChild(CollisionEntity);
    if (!collider) return;

    const shape = collider.shape;
    const transform = collider.getComponent(TransformComponent).globalTransform;

    ctx.fillStyle = this.color;

    if (shape instanceof CircleCollisionShape) {
      const radius = shape.radius * transform.scale;
      const center = camera.toCanvas(transform.position, canvasSize);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (shape instanceof RectangleCollisionShape) {
      const bbox = collider.bbox();
      const topLeft = camera.toCanvas(new Vector2D(bbox.x, bbox.y), canvasSize);
      ctx.fillRect(topLeft.x, topLeft.y, bbox.width, bbox.height);
    }
  }
}
