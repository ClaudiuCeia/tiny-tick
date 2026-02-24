import { Component, PhysicsBodyComponent, TransformComponent, Vector2D } from "../lib.ts";
import type { EnemyEntity } from "../entities/EnemyEntity.ts";

export class EnemyChaseComponent extends Component<EnemyEntity> {
  constructor(private readonly getTargetPosition: () => Vector2D) {
    super();
  }

  public override update(_dt: number): void {
    const target = this.getTargetPosition();
    const transform = this.ent.getComponent(TransformComponent);
    const current = transform.globalTransform.position;

    const toTarget = target.subtract(current);
    if (toTarget.magnitude === 0) {
      this.ent.getComponent(PhysicsBodyComponent).setVelocity(Vector2D.zero);
      return;
    }

    const direction = toTarget.normalize();
    this.ent.getComponent(PhysicsBodyComponent).setVelocity(direction.multiply(this.ent.speed));
  }
}
