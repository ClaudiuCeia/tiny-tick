import { Component, TransformComponent, type Vector2D } from "../lib.ts";
import type { EnemyEntity } from "../entities/EnemyEntity.ts";

export class EnemyChaseComponent extends Component<EnemyEntity> {
  constructor(private readonly getTargetPosition: () => Vector2D) {
    super();
  }

  public override update(dt: number): void {
    const target = this.getTargetPosition();
    const transform = this.ent.getComponent(TransformComponent);
    const current = transform.globalTransform.position;

    const toTarget = target.subtract(current);
    if (toTarget.magnitude === 0) return;

    const direction = toTarget.normalize();
    transform.translate(direction.x * this.ent.speed * dt, direction.y * this.ent.speed * dt);
  }
}
