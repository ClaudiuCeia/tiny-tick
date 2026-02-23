export abstract class Scene {
  public abstract awake(): void;
  public abstract update(dt: number): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
  public abstract destroy(): void;
}

export class SceneManager {
  private current: Scene | null = null;

  public changeScene(next: Scene): void {
    if (this.current) {
      this.current.destroy();
    }
    this.current = next;
    this.current.awake();
  }

  public update(dt: number): void {
    this.current?.update(dt);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.current?.render(ctx);
  }
}
