import {
  type Entity,
  HudRenderComponent,
  RenderLayer,
  type Vector2D,
  type ICamera,
} from "../lib.ts";

export type HudSnapshot = {
  score: number;
  hp: number;
  gameOver: boolean;
};

export class ArenaHudComponent extends HudRenderComponent<Entity> {
  constructor(private readonly readSnapshot: () => HudSnapshot) {
    super(RenderLayer.HUD);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const snapshot = this.readSnapshot();

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText(`Score: ${snapshot.score}`, 12, 24);
    ctx.fillText(`HP: ${snapshot.hp}`, 12, 46);

    if (!snapshot.gameOver) return;

    ctx.fillStyle = "#ff6961";
    ctx.font = "24px monospace";
    ctx.fillText("Game Over", 280, 280);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px monospace";
    ctx.fillText("Press R to restart", 260, 310);
  }
}
