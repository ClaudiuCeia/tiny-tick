import {
  CollisionEntity,
  Entity,
  PhysicsBodyComponent,
  RectangleCollisionShape,
  TransformComponent,
  type Vector2D,
} from "../lib.ts";
import { RectRenderComponent } from "../components/RectRenderComponent.ts";
import { RunnerJumpComponent } from "../components/RunnerJumpComponent.ts";
import { RunnerSpriteRenderComponent } from "../components/RunnerSpriteRenderComponent.ts";

type RunnerSpriteSet = {
  idle: HTMLImageElement;
  jump: HTMLImageElement;
  walkA: HTMLImageElement;
  walkB: HTMLImageElement;
  hit: HTMLImageElement;
};

export class RunnerEntity extends Entity {
  public readonly width = 44;
  public readonly height = 64;
  private readonly collider: CollisionEntity;
  private dead = false;

  constructor(
    start: Vector2D,
    public readonly groundY: number,
    options: {
      sprites?: RunnerSpriteSet;
      onJump?: () => void;
      onLand?: () => void;
    } = {},
  ) {
    super();
    this.addComponent(new TransformComponent({ position: start, rotation: 0, scale: 1 }));
    this.addComponent(
      new PhysicsBodyComponent({
        gravityScale: 0,
        friction: 0,
        restitution: 0,
        linearDamping: 0,
      }),
    );
    this.addComponent(new RunnerJumpComponent(groundY, -640, options.onJump, options.onLand));

    if (options.sprites) {
      this.addComponent(new RunnerSpriteRenderComponent(options.sprites));
    } else {
      this.addComponent(new RectRenderComponent("#4ecdc4"));
    }

    this.collider = new CollisionEntity(
      new RectangleCollisionShape(this.width, this.height),
      "center",
      1,
    );
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public isGrounded(groundY: number): boolean {
    const y = this.getComponent(TransformComponent).transform.position.y;
    return y + this.height / 2 >= groundY - 0.001;
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }

  public getPosition(): Vector2D {
    return this.getComponent(TransformComponent).globalTransform.position;
  }

  public getBody(): PhysicsBodyComponent {
    return this.getComponent(PhysicsBodyComponent);
  }

  public get isDead(): boolean {
    return this.dead;
  }

  public setDead(dead: boolean): void {
    this.dead = dead;
  }
}
