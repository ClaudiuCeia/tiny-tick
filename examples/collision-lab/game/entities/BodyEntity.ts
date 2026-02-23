import {
  CircleCollisionShape,
  CollisionEntity,
  Entity,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "../lib.ts";
import { BodyRenderComponent } from "../components/BodyRenderComponent.ts";

export type BodyKind = "circle" | "rect";

export class BodyEntity extends Entity {
  private readonly collider: CollisionEntity;

  constructor(
    public readonly kind: BodyKind,
    position: Vector2D,
    size: number,
    color: string,
    layer: number,
    mask: number,
  ) {
    super();

    this.addComponent(new TransformComponent({ position, rotation: 0, scale: 1 }));
    this.addComponent(new BodyRenderComponent(color));

    const shape =
      kind === "circle"
        ? new CircleCollisionShape(size / 2)
        : new RectangleCollisionShape(size, Math.max(10, size * 0.75));

    this.collider = new CollisionEntity(shape, "center", layer, mask);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }

  public setPosition(position: Vector2D): void {
    this.getComponent(TransformComponent).setPosition(position);
  }

  public getPosition(): Vector2D {
    return this.getComponent(TransformComponent).globalTransform.position;
  }

  public setLayer(layer: number): void {
    this.collider.setCollisionLayer(layer);
  }

  public setMask(mask: number): void {
    this.collider.setCollisionMask(mask);
  }

  public get layer(): number {
    return this.collider.layer;
  }

  public get mask(): number {
    return this.collider.collisionMask;
  }
}
