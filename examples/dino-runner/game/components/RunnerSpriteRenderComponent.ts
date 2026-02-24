import { SpriteAnimator, SpriteRenderComponent, RenderLayer } from "../lib.ts";
import type { RunnerEntity } from "../entities/RunnerEntity.ts";

type SpriteSet = {
  idle: HTMLImageElement;
  jump: HTMLImageElement;
  walkA: HTMLImageElement;
  walkB: HTMLImageElement;
  hit: HTMLImageElement;
};

export class RunnerSpriteRenderComponent extends SpriteRenderComponent<RunnerEntity> {
  private readonly animator: SpriteAnimator<HTMLImageElement>;
  private state: "run" | "jump" | "hit" = "run";

  constructor(sprites: SpriteSet) {
    const animator = new SpriteAnimator(sprites.idle);
    animator
      .defineClip("run", {
        frames: [sprites.walkA, sprites.walkB],
        frameDuration: 0.12,
        loop: true,
      })
      .defineClip("jump", { frames: [sprites.jump], frameDuration: 1, loop: false })
      .defineClip("hit", { frames: [sprites.hit], frameDuration: 1, loop: false })
      .play("run");

    super({
      zIndex: RenderLayer.World,
      sprite: () => animator.getFrame(),
      align: { x: "center", y: "bottom" },
    });
    this.animator = animator;
  }

  public override update(dt: number): void {
    super.update(dt);
    const nextState = this.pickState();
    if (nextState !== this.state) {
      this.state = nextState;
      this.animator.play(nextState);
    }
    this.animator.update(dt);
  }

  private pickState(): "run" | "jump" | "hit" {
    if (this.ent.isDead) return "hit";
    if (!this.ent.isGrounded(this.ent.groundY)) return "jump";
    return "run";
  }
}
