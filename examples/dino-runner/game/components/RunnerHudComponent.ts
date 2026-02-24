import {
  type Entity,
  HudRenderComponent,
  RenderLayer,
  type Vector2D,
  type ICamera,
} from "../lib.ts";

export type RunnerHudSnapshot = {
  score: number;
  gameOver: boolean;
  fontFamily?: string;
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
    const fontFamily = snapshot.fontFamily ?? "monospace";

    ctx.save();
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(8, 8, 170, 34);

    ctx.fillStyle = "#ffffff";
    ctx.font = `22px "${fontFamily}", monospace`;
    const scoreLabel = `Score: ${snapshot.score}`;
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(scoreLabel, 16, 33);
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (!snapshot.gameOver) {
      ctx.restore();
      return;
    }

    const centerX = _canvasSize.x / 2;
    const centerY = _canvasSize.y / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(centerX - 240, centerY - 86, 480, 160);

    ctx.fillStyle = "#ff4d5a";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.92)";
    ctx.lineWidth = 4;
    ctx.font = `48px "${fontFamily}", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("Game Over", centerX, centerY - 12);
    ctx.fillText("Game Over", centerX, centerY - 12);

    ctx.fillStyle = "#ffffff";
    ctx.font = `22px "${fontFamily}", monospace`;
    ctx.strokeText("Press R to restart", centerX, centerY + 36);
    ctx.fillText("Press R to restart", centerX, centerY + 36);
    ctx.restore();
  }
}
