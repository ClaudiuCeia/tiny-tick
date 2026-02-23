import { Component, TransformComponent, type Vector2D } from "../lib.ts";
import type { BulletEntity } from "../entities/BulletEntity.ts";

export class BulletMotionComponent extends Component<BulletEntity> {
  private lifeRemaining: number;

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
    this.lifeRemaining -= dt;

    const transform = this.ent.getComponent(TransformComponent);
    transform.translate(this.direction.x * this.speed * dt, this.direction.y * this.speed * dt);

    const pos = transform.globalTransform.position;
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
