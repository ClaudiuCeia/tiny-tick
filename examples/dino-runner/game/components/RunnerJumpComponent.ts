import { Component, PhysicsBodyComponent, TransformComponent, Vector2D } from "../lib.ts";
import type { RunnerEntity } from "../entities/RunnerEntity.ts";
import type { BroadcastEventBus } from "../lib.ts";
import type { RunnerEventPayload } from "../events.ts";

export class RunnerJumpComponent extends Component<RunnerEntity> {
  private wasGrounded = true;

  constructor(
    private readonly groundY: number,
    private readonly jumpVelocity: number,
    private readonly eventBus: BroadcastEventBus<RunnerEventPayload>,
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

    const body = this.ent.getComponent(PhysicsBodyComponent);

    if (jumpPressed && this.ent.isGrounded(this.groundY) && !this.ent.isDead) {
      body.setGravityScale(1);
      const velocity = body.getVelocity();
      body.setVelocity(new Vector2D(velocity.x, this.jumpVelocity));
      this.eventBus.publish("runner_jumped", {});
    }

    const transform = this.ent.getComponent(TransformComponent);
    const playerBottom = transform.transform.position.y + this.ent.height / 2;
    const groundedNow = playerBottom >= this.groundY && body.getVelocity().y >= 0;

    if (groundedNow) {
      transform.transform.position.y = this.groundY - this.ent.height / 2;
      body.setGravityScale(0);
      const velocity = body.getVelocity();
      body.setVelocity(new Vector2D(velocity.x, 0));
    }

    if (!this.wasGrounded && groundedNow) {
      this.eventBus.publish("runner_landed", {});
    }
    this.wasGrounded = groundedNow;
  }
}
