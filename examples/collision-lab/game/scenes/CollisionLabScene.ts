import {
  EcsRuntime,
  Entity,
  RenderSystem,
  Scene,
  SpatialHashBroadphase,
  TransformComponent,
  Vector2D,
  type CollisionPair,
  type ICanvas,
} from "../lib.ts";
import { LabOverlayHudComponent } from "../components/LabOverlayHudComponent.ts";
import { BodyEntity, type BodyKind } from "../entities/BodyEntity.ts";
import { CurveEntity } from "../entities/CurveEntity.ts";
import { LabCamera } from "../entities/LabCamera.ts";

class WorldRoot extends Entity {
  public override update(dt: number): void {
    super.update(dt);
  }
}

class HudEntity extends Entity {
  public override update(dt: number): void {
    super.update(dt);
  }
}

type DebugLine = { from: Vector2D; to: Vector2D };

export type CollisionLabSnapshot = {
  totalColliders: number;
  broadphasePairs: number;
  collisionPairs: number;
  selectedLabel: string;
  selectedLayer: number;
  selectedMask: number;
};

export class CollisionLabScene extends Scene {
  private root: WorldRoot | null = null;
  private camera: LabCamera | null = null;
  private renderSystem: RenderSystem | null = null;
  private hudEntity: HudEntity | null = null;

  private curve: CurveEntity | null = null;
  private bodies: BodyEntity[] = [];
  private selectedBody: BodyEntity | null = null;
  private dragOffset: Vector2D | null = null;
  private pointerOffset = new Vector2D(0, 0);

  private readonly broadphase = new SpatialHashBroadphase(80);
  private candidatePairs: CollisionPair[] = [];
  private hitPairs: CollisionPair[] = [];
  private candidateLines: DebugLine[] = [];
  private collisionLines: DebugLine[] = [];
  private normalLines: DebugLine[] = [];

  constructor(
    private readonly runtime: EcsRuntime,
    private readonly canvas: ICanvas,
  ) {
    super();
  }

  public override awake(): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.root = new WorldRoot();
      this.camera = new LabCamera(this.canvas.size.x, this.canvas.size.y);
      this.renderSystem = new RenderSystem(this.canvas, this.camera, this.runtime);
      this.hudEntity = new HudEntity();

      this.root.addComponent(
        new TransformComponent({ position: new Vector2D(0, 0), rotation: 0, scale: 1 }),
      );

      this.hudEntity.addComponent(
        new LabOverlayHudComponent(() => ({
          totalColliders: this.getTotalColliders(),
          broadphasePairs: this.candidatePairs.length,
          collisionPairs: this.hitPairs.length,
          selectedLabel: this.selectedBody
            ? `${this.selectedBody.kind} @ ${this.selectedBody.id.slice(0, 6)}`
            : "none",
          candidateLines: this.candidateLines,
          collisionLines: this.collisionLines,
          normalLines: this.normalLines,
        })),
      );

      this.root.addChild(this.camera);
      this.root.addChild(this.hudEntity);

      this.curve = new CurveEntity(this.canvas.size.x, this.canvas.size.y - 110);
      this.root.addChild(this.curve);

      this.spawnRandomBodies(24);
      this.root.awake();
      this.recomputeCollisionDebug();
    });
  }

  public override update(dt: number): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.handleInputs();
      this.root?.update(dt);
      this.recomputeCollisionDebug();
    });
  }

  public override render(_ctx: CanvasRenderingContext2D): void {
    EcsRuntime.runWith(this.runtime, () => {
      if (!this.camera || !this.renderSystem) return;
      this.camera.setViewport(this.canvas.size.x, this.canvas.size.y);
      this.renderSystem.render();
    });
  }

  public override destroy(): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.root?.destroy();
      this.root = null;
      this.camera = null;
      this.renderSystem = null;
      this.hudEntity = null;
      this.curve = null;
      this.bodies.length = 0;
      this.selectedBody = null;
      this.dragOffset = null;
      this.runtime.registry.clear();
    });
  }

  private handleInputs(): void {
    const input = this.runtime.input;
    const mouse = input.getMousePos();
    const mousePos = new Vector2D(mouse.x - this.pointerOffset.x, mouse.y - this.pointerOffset.y);

    if (input.isMousePressed(0)) {
      this.selectedBody = this.pickBodyAt(mousePos);
      this.dragOffset = this.selectedBody
        ? this.selectedBody.getPosition().subtract(mousePos)
        : null;
    }

    if (input.isMouseDown(0) && input.isDragging(0) && this.selectedBody && this.dragOffset) {
      const next = mousePos.add(this.dragOffset);
      this.selectedBody.setPosition(next);
    }

    if (input.isMouseReleased(0)) {
      this.dragOffset = null;
    }

    if (input.isPressed("1")) {
      this.spawnBody("circle", mousePos, 32, 0b0001, 0xffffffff);
    }
    if (input.isPressed("2")) {
      this.spawnBody("rect", mousePos, 42, 0b0010, 0xffffffff);
    }
  }

  private spawnRandomBodies(count: number): void {
    for (let i = 0; i < count; i++) {
      const kind: BodyKind = Math.random() > 0.5 ? "circle" : "rect";
      const position = new Vector2D(
        60 + Math.random() * (this.canvas.size.x - 120),
        50 + Math.random() * (this.canvas.size.y - 230),
      );
      const size = 24 + Math.random() * 24;
      const layer = [0b0001, 0b0010, 0b0100][i % 3]!;
      const mask = i % 4 === 0 ? 0b0011 : 0xffffffff;
      this.spawnBody(kind, position, size, layer, mask);
    }
  }

  private spawnBody(
    kind: BodyKind,
    position: Vector2D,
    size: number,
    layer: number,
    mask: number,
  ): BodyEntity {
    const color = kind === "circle" ? "#ff6b6b" : "#5fa8ff";
    const body = new BodyEntity(kind, position, size, color, layer, mask);
    this.bodies.push(body);
    this.root?.addChild(body);
    return body;
  }

  private pickBodyAt(point: Vector2D): BodyEntity | null {
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i]!;
      if (!body.isAwake) continue;
      if (body.getCollider().containsPoint(point)) return body;
    }
    return null;
  }

  private recomputeCollisionDebug(): void {
    const colliders = this.getColliders();
    this.candidatePairs = this.broadphase.queryPairs(colliders);

    this.hitPairs = [];
    this.candidateLines = [];
    this.collisionLines = [];
    this.normalLines = [];

    for (const [a, b] of this.candidatePairs) {
      const centerA = this.centerOf(a);
      const centerB = this.centerOf(b);
      this.candidateLines.push({ from: centerA, to: centerB });

      if (!a.isColliding(b)) continue;
      this.hitPairs.push([a, b]);
      this.collisionLines.push({ from: centerA, to: centerB });

      const mtv = a.getCollisionNormal(b);
      if (mtv) {
        this.normalLines.push({ from: centerA, to: centerA.add(mtv) });
      }
    }
  }

  private getColliders(): ReturnType<BodyEntity["getCollider"]>[] {
    const colliders = this.bodies.filter((b) => b.isAwake).map((b) => b.getCollider());
    if (this.curve && this.curve.isAwake) {
      colliders.push(this.curve.getCollider());
    }
    return colliders;
  }

  private centerOf(collider: ReturnType<BodyEntity["getCollider"]>): Vector2D {
    const bbox = collider.bbox();
    return new Vector2D(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
  }

  private getTotalColliders(): number {
    return this.getColliders().length;
  }

  public getSnapshot(): CollisionLabSnapshot {
    return {
      totalColliders: this.getTotalColliders(),
      broadphasePairs: this.candidatePairs.length,
      collisionPairs: this.hitPairs.length,
      selectedLabel: this.selectedBody
        ? `${this.selectedBody.kind} @ ${this.selectedBody.id.slice(0, 6)}`
        : "none",
      selectedLayer: this.selectedBody?.layer ?? 0,
      selectedMask: this.selectedBody?.mask ?? 0,
    };
  }

  public setSelectedLayer(layer: number): void {
    this.selectedBody?.setLayer(layer);
  }

  public setSelectedMask(mask: number): void {
    this.selectedBody?.setMask(mask);
  }

  public spawnBodyForTest(kind: BodyKind, position: Vector2D, layer: number, mask: number): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.spawnBody(kind, position, 40, layer, mask);
      this.recomputeCollisionDebug();
    });
  }

  public setPointerOffset(x: number, y: number): void {
    this.pointerOffset.x = x;
    this.pointerOffset.y = y;
  }

  public clearBodiesForTest(): void {
    EcsRuntime.runWith(this.runtime, () => {
      for (const body of this.bodies) {
        body.destroy();
      }
      this.bodies.length = 0;
      this.selectedBody = null;
      this.dragOffset = null;
      this.recomputeCollisionDebug();
    });
  }
}
