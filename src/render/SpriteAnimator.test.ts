import { describe, expect, test } from "bun:test";
import { SpriteAnimator } from "./SpriteAnimator.ts";

describe("SpriteAnimator", () => {
  test("plays looping clips and advances frames by dt", () => {
    const animator = new SpriteAnimator("idle");
    animator.defineClip("run", { frames: ["a", "b"], frameDuration: 0.1, loop: true });
    animator.play("run");

    expect(animator.getFrame()).toBe("a");
    animator.update(0.11);
    expect(animator.getFrame()).toBe("b");
    animator.update(0.11);
    expect(animator.getFrame()).toBe("a");
  });

  test("non-looping clip stays on the last frame", () => {
    const animator = new SpriteAnimator("idle");
    animator.defineClip("hit", { frames: ["h1", "h2"], frameDuration: 0.05, loop: false });
    animator.play("hit");

    animator.update(0.2);
    expect(animator.getFrame()).toBe("h2");
    animator.update(0.2);
    expect(animator.getFrame()).toBe("h2");
  });

  test("play() resets to first frame when switching clips", () => {
    const animator = new SpriteAnimator("idle");
    animator.defineClip("run", { frames: ["a", "b"], frameDuration: 0.1 });
    animator.defineClip("jump", { frames: ["j"], frameDuration: 1 });

    animator.play("run");
    animator.update(0.11);
    expect(animator.getFrame()).toBe("b");

    animator.play("jump");
    expect(animator.getFrame()).toBe("j");
  });
});
