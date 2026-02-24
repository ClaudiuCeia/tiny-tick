import { Component, PhysicsBodyComponent, TransformComponent, type Vector2D } from "../lib.ts";
import type { BulletEntity } from "../entities/BulletEntity.ts";

export class BulletMotionComponent extends Component<BulletEntity> {
  private lifeRemaining: number;
  private initialized = false;

  constructor(
    private readonly direction: Vector2D,
    private readonly speed: number,
    private readonly ttlSeconds: number,
    private readonly bounds: { width: number; height: number },
  ) {
    super();
    this.lifeRemaining = ttlSeconds;
  }

  public override update(dt: number): void {
    if (!this.initialized) {
      this.ent.getComponent(PhysicsBodyComponent).setVelocity(this.direction.multiply(this.speed));
      this.initialized = true;
    }

    this.lifeRemaining -= dt;
    const pos = this.ent.getComponent(TransformComponent).globalTransform.position;
    const outsideBounds =
      pos.x < -32 ||
      pos.y < -32 ||
      pos.x > this.bounds.width + 32 ||
      pos.y > this.bounds.height + 32;

    if (this.lifeRemaining <= 0 || outsideBounds) {
      this.ent.destroy();
    }
  }
}
