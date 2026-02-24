import { Component, PhysicsBodyComponent, TransformComponent, Vector2D } from "../lib.ts";
import type { PlayerEntity } from "../entities/PlayerEntity.ts";

type ShootCallback = (position: Vector2D, direction: Vector2D) => void;

export class PlayerControllerComponent extends Component<PlayerEntity> {
  private shootCooldown = 0;

  constructor(
    private readonly speed: number,
    private readonly fireCooldownSeconds: number,
    private readonly onShoot: ShootCallback,
  ) {
    super();
  }

  public override update(_dt: number): void {
    const input = this.ent.runtime.input;

    let moveX = 0;
    let moveY = 0;

    if (input.isDown("a") || input.isDown("ArrowLeft")) moveX -= 1;
    if (input.isDown("d") || input.isDown("ArrowRight")) moveX += 1;
    if (input.isDown("w") || input.isDown("ArrowUp")) moveY -= 1;
    if (input.isDown("s") || input.isDown("ArrowDown")) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      const direction = new Vector2D(moveX, moveY).normalize();
      this.ent.facing = direction;
      this.ent.getComponent(PhysicsBodyComponent).setVelocity(direction.multiply(this.speed));
    } else {
      this.ent.getComponent(PhysicsBodyComponent).setVelocity(Vector2D.zero);
    }

    this.shootCooldown = Math.max(0, this.shootCooldown - _dt);

    const shootPressed = input.isPressed("Space") || input.isPressed(" ");
    if (!shootPressed || this.shootCooldown > 0) {
      return;
    }

    const position = this.ent.getComponent(TransformComponent).globalTransform.position;
    this.onShoot(position.clone(), this.ent.facing.clone());
    this.shootCooldown = this.fireCooldownSeconds;
  }
}
