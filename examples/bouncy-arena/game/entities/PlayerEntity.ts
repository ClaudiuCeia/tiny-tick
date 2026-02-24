import {
  CollisionEntity,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "../lib.ts";
import { PlayerControllerComponent } from "../components/PlayerControllerComponent.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";

export class PlayerEntity extends Entity {
  public facing = new Vector2D(1, 0);
  private readonly collider: CollisionEntity;

  constructor(position: Vector2D, onShoot: (position: Vector2D, direction: Vector2D) => void) {
    super();
    this.addComponent(new TransformComponent({ position, rotation: 0, scale: 1 }));
    this.addComponent(
      new PhysicsBodyComponent({
        type: PhysicsBodyType.Kinematic,
        gravityScale: 0,
        linearDamping: 0,
        friction: 0.2,
        restitution: 0,
      }),
    );
    this.addComponent(new PlayerControllerComponent(240, 0.15, onShoot));
    this.addComponent(new RectRenderComponent("#4ecdc4"));

    this.collider = new CollisionEntity(new RectangleCollisionShape(28, 28), "center", 1);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public get position(): Vector2D {
    return this.getComponent(TransformComponent).globalTransform.position;
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }
}
