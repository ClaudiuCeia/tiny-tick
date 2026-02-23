import {
  CollisionEntity,
  Entity,
  RectangleCollisionShape,
  TransformComponent,
  type Vector2D,
} from "../lib.ts";
import { ObstacleMoveComponent } from "../components/ObstacleMoveComponent.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";

export class ObstacleEntity extends Entity {
  private readonly collider: CollisionEntity;

  constructor(position: Vector2D, width: number, height: number, speed: number) {
    super();
    this.addComponent(new TransformComponent({ position, rotation: 0, scale: 1 }));
    this.addComponent(new ObstacleMoveComponent(speed));
    this.addComponent(new RectRenderComponent("#ff6b6b"));

    this.collider = new CollisionEntity(new RectangleCollisionShape(width, height), "center", 2);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }
}
