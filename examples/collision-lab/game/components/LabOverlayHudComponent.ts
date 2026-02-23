import { Entity, HudRenderComponent, RenderLayer, Vector2D, type ICamera } from "../lib.ts";

type DebugLine = { from: Vector2D; to: Vector2D };

type OverlaySnapshot = {
  totalColliders: number;
  broadphasePairs: number;
  collisionPairs: number;
  selectedLabel: string;
  candidateLines: DebugLine[];
  collisionLines: DebugLine[];
  normalLines: DebugLine[];
};

export class LabOverlayHudComponent extends HudRenderComponent<Entity> {
  constructor(private readonly readSnapshot: () => OverlaySnapshot) {
    super(RenderLayer.HUD);
  }

  public override doRender(
    ctx: CanvasRenderingContext2D,
    _camera: ICamera,
    _canvasSize: Vector2D,
  ): void {
    const snapshot = this.readSnapshot();

    ctx.fillStyle = "#ffffff";
    ctx.font = "14px monospace";
    ctx.fillText(`Colliders: ${snapshot.totalColliders}`, 12, 22);
    ctx.fillText(`Broadphase pairs: ${snapshot.broadphasePairs}`, 12, 40);
    ctx.fillText(`Narrow hits: ${snapshot.collisionPairs}`, 12, 58);
    ctx.fillText(`Selected: ${snapshot.selectedLabel}`, 12, 76);

    ctx.strokeStyle = "rgba(255, 214, 102, 0.4)";
    for (const line of snapshot.candidateLines) {
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 107, 107, 0.9)";
    for (const line of snapshot.collisionLines) {
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(78, 205, 196, 0.95)";
    for (const line of snapshot.normalLines) {
      ctx.beginPath();
      ctx.moveTo(line.from.x, line.from.y);
      ctx.lineTo(line.to.x, line.to.y);
      ctx.stroke();
    }
  }
}
