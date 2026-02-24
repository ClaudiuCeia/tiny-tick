import {
  CollisionEntity,
  Entity,
  PhysicsBodyComponent,
  PhysicsBodyType,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "../lib.ts";
import { EnemyChaseComponent } from "../components/EnemyChaseComponent.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";

export class EnemyEntity extends Entity {
  private readonly collider: CollisionEntity;

  constructor(
    position: Vector2D,
    public readonly speed: number,
    getTargetPosition: () => Vector2D,
  ) {
    super();
    this.addComponent(new TransformComponent({ position, rotation: 0, scale: 1 }));
    this.addComponent(
      new PhysicsBodyComponent({
        type: PhysicsBodyType.Kinematic,
        gravityScale: 0,
        linearDamping: 0,
        friction: 0.1,
        restitution: 0,
      }),
    );
    this.addComponent(new EnemyChaseComponent(getTargetPosition));
    this.addComponent(new RectRenderComponent("#ff6b6b"));

    this.collider = new CollisionEntity(new RectangleCollisionShape(26, 26), "center", 2);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }
}
