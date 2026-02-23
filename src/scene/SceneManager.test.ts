import { describe, test, expect } from "bun:test";
import { Scene, SceneManager } from "./SceneManager.ts";

class TestScene extends Scene {
  public calls: string[] = [];

  constructor(private label: string) {
    super();
  }

  awake(): void {
    this.calls.push(`${this.label}:awake`);
  }

  update(dt: number): void {
    this.calls.push(`${this.label}:update:${dt}`);
  }

  render(_ctx: CanvasRenderingContext2D): void {
    this.calls.push(`${this.label}:render`);
  }

  destroy(): void {
    this.calls.push(`${this.label}:destroy`);
  }
}

describe("SceneManager", () => {
  test("changeScene destroys previous scene and awakens next scene", () => {
    const mgr = new SceneManager();
    const a = new TestScene("a");
    const b = new TestScene("b");

    mgr.changeScene(a);
    mgr.changeScene(b);

    expect(a.calls).toEqual(["a:awake", "a:destroy"]);
    expect(b.calls).toEqual(["b:awake"]);
  });

  test("update and render delegate to active scene", () => {
    const mgr = new SceneManager();
    const scene = new TestScene("main");

    mgr.changeScene(scene);
    mgr.update(0.016);
    mgr.render({} as CanvasRenderingContext2D);

    expect(scene.calls).toEqual(["main:awake", "main:update:0.016", "main:render"]);
  });

  test("update and render are no-op when there is no current scene", () => {
    const mgr = new SceneManager();

    expect(() => mgr.update(1)).not.toThrow();
    expect(() => mgr.render({} as CanvasRenderingContext2D)).not.toThrow();
  });
});
