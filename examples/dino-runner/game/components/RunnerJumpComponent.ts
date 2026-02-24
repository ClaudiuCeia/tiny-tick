import { Component, PhysicsBodyComponent, TransformComponent, Vector2D } from "../lib.ts";
import type { RunnerEntity } from "../entities/RunnerEntity.ts";

export class RunnerJumpComponent extends Component<RunnerEntity> {
  constructor(
    private readonly groundY: number,
    private readonly jumpVelocity: number,
  ) {
    super();
  }

  public override update(_dt: number): void {
    const input = this.ent.runtime.input;
    const jumpPressed =
      input.isPressed(" ") ||
      input.isPressed("Space") ||
      input.isPressed("ArrowUp") ||
      input.isPressed("w") ||
      input.isPressed("W");

    if (jumpPressed && this.ent.isGrounded(this.groundY)) {
      const body = this.ent.getComponent(PhysicsBodyComponent);
      body.setGravityScale(1);
      const velocity = body.getVelocity();
      body.setVelocity(new Vector2D(velocity.x, this.jumpVelocity));
    }
    const transform = this.ent.getComponent(TransformComponent);
    const body = this.ent.getComponent(PhysicsBodyComponent);

    const playerBottom = transform.transform.position.y + this.ent.height / 2;
    if (playerBottom >= this.groundY && body.getVelocity().y >= 0) {
      transform.transform.position.y = this.groundY - this.ent.height / 2;
      body.setGravityScale(0);
      const velocity = body.getVelocity();
      body.setVelocity(new Vector2D(velocity.x, 0));
    }
  }
}
