import { Component, TransformComponent } from "../lib.ts";
import type { RunnerEntity } from "../entities/RunnerEntity.ts";

export class RunnerJumpComponent extends Component<RunnerEntity> {
  private verticalVelocity = 0;

  constructor(
    private readonly groundY: number,
    private readonly jumpVelocity: number,
    private readonly gravity: number,
  ) {
    super();
  }

  public override update(dt: number): void {
    const input = this.ent.runtime.input;
    const jumpPressed =
      input.isPressed(" ") ||
      input.isPressed("Space") ||
      input.isPressed("ArrowUp") ||
      input.isPressed("w") ||
      input.isPressed("W");

    if (jumpPressed && this.ent.isGrounded(this.groundY)) {
      this.verticalVelocity = this.jumpVelocity;
    }

    this.verticalVelocity += this.gravity * dt;

    const transform = this.ent.getComponent(TransformComponent);
    transform.translate(0, this.verticalVelocity * dt);

    const playerBottom = transform.transform.position.y + this.ent.height / 2;
    if (playerBottom >= this.groundY) {
      transform.transform.position.y = this.groundY - this.ent.height / 2;
      this.verticalVelocity = 0;
    }
  }
}
