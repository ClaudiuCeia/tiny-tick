import {
  CollisionEntity,
  Entity,
  RectangleCollisionShape,
  RenderLayer,
  TransformComponent,
  type Vector2D,
} from "../lib.ts";
import { BulletMotionComponent } from "../components/BulletMotionComponent.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";

export class BulletEntity extends Entity {
  private readonly collider: CollisionEntity;

  constructor(position: Vector2D, direction: Vector2D, bounds: { width: number; height: number }) {
    super();
    this.addComponent(new TransformComponent({ position, rotation: 0, scale: 1 }));
    this.addComponent(new BulletMotionComponent(direction.normalize(), 420, 1.2, bounds));
    this.addComponent(new RectRenderComponent("#ffe66d", RenderLayer.World));

    this.collider = new CollisionEntity(new RectangleCollisionShape(10, 6), "center", 3);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }
}
