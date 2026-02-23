import { Component, TransformComponent } from "../lib.ts";
import type { ObstacleEntity } from "../entities/ObstacleEntity.ts";

export class ObstacleMoveComponent extends Component<ObstacleEntity> {
  constructor(private readonly speed: number) {
    super();
  }

  public override update(dt: number): void {
    const transform = this.ent.getComponent(TransformComponent);
    transform.translate(-this.speed * dt, 0);

    const bbox = this.ent.getCollider().bbox();
    if (bbox.x + bbox.width < -32) {
      this.ent.destroy();
    }
  }
}
