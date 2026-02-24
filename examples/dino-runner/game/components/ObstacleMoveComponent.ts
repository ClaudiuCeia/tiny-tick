import { Component, PhysicsBodyComponent, Vector2D } from "../lib.ts";
import type { ObstacleEntity } from "../entities/ObstacleEntity.ts";

export class ObstacleMoveComponent extends Component<ObstacleEntity> {
  constructor(private readonly speed: number) {
    super();
  }

  public override update(_dt: number): void {
    this.ent.getComponent(PhysicsBodyComponent).setVelocity(new Vector2D(-this.speed, 0));

    const bbox = this.ent.getCollider().bbox();
    if (bbox.x + bbox.width < -32) {
      this.ent.destroy();
    }
  }
}
