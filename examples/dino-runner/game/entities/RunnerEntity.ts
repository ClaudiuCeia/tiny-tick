import {
  CollisionEntity,
  Entity,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "../lib.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";
import { RunnerJumpComponent } from "../components/RunnerJumpComponent.ts";

export class RunnerEntity extends Entity {
  public readonly width = 30;
  public readonly height = 42;
  private readonly collider: CollisionEntity;

  constructor(start: Vector2D, groundY: number) {
    super();
    this.addComponent(new TransformComponent({ position: start, rotation: 0, scale: 1 }));
    this.addComponent(new RunnerJumpComponent(groundY, -460, 1400));
    this.addComponent(new RectRenderComponent("#4ecdc4"));

    this.collider = new CollisionEntity(
      new RectangleCollisionShape(this.width, this.height),
      "center",
      1,
    );
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public isGrounded(groundY: number): boolean {
    const y = this.getComponent(TransformComponent).transform.position.y;
    return y + this.height / 2 >= groundY - 0.001;
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }

  public getPosition(): Vector2D {
    return this.getComponent(TransformComponent).globalTransform.position;
  }
}
