import { type Entity, HudRenderComponent, RenderLayer, type Vector2D, type ICamera } from "../lib.ts";

export type RunnerHudSnapshot = {
  score: number;
  gameOver: boolean;
};

export class RunnerHudComponent extends HudRenderComponent<Entity> {
  constructor(private readonly readSnapshot: () => RunnerHudSnapshot) {
    super(RenderLayer.HUD);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const snapshot = this.readSnapshot();

    ctx.fillStyle = "#ffffff";
    ctx.font = "18px monospace";
    ctx.fillText(`Score: ${snapshot.score}`, 12, 28);

    ctx.fillStyle = "#4ecdc4";
    ctx.fillRect(0, 450, 900, 4);

    if (!snapshot.gameOver) return;

    ctx.fillStyle = "#ff6b6b";
    ctx.font = "26px monospace";
    ctx.fillText("Game Over", 330, 190);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText("Press R to restart", 312, 220);
  }
}
