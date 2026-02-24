import {
  EcsRuntime,
  Entity,
  PhysicsBodyType,
  RenderSystem,
  Scene,
  TransformComponent,
  Vector2D,
  type ICanvas,
} from "../lib.ts";
import type { RunnerAssetBundle } from "../assets.ts";
import { RunnerHudComponent } from "../components/RunnerHudComponent.ts";
import { createRunnerEventBus } from "../events.ts";
import { ObstacleEntity } from "../entities/ObstacleEntity.ts";
import { RunnerCamera } from "../entities/RunnerCamera.ts";
import { RunnerEntity } from "../entities/RunnerEntity.ts";

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

export class RunnerScene extends Scene {
  private readonly eventBus = createRunnerEventBus();

  private root: WorldRoot | null = null;
  private camera: RunnerCamera | null = null;
  private renderSystem: RenderSystem | null = null;
  private hudEntity: HudEntity | null = null;

  private runner: RunnerEntity | null = null;
  private obstacles: ObstacleEntity[] = [];
  private scoredObstacles = new WeakSet<ObstacleEntity>();

  private score = 0;
  private gameOver = false;
  private spawnTimer = 0;
  private nextSpawnIn = 1.1;
  private readonly subscriptions: string[] = [];

  private readonly groundY: number;
  private readonly runnerX = 120;
  private readonly worldScrollSpeed = 260;
  private cloudOffset = 0;
  private terrainOffset = 0;

  constructor(
    private readonly runtime: EcsRuntime,
    private readonly canvas: ICanvas,
    private readonly assets?: RunnerAssetBundle,
  ) {
    super();
    this.groundY = this.canvas.size.y - 50;
  }

  public override awake(): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.installEventHandlers();

      this.root = new WorldRoot();
      this.camera = new RunnerCamera(this.canvas.size.x, this.canvas.size.y);
      this.renderSystem = new RenderSystem(this.canvas, this.camera, this.runtime);
      this.hudEntity = new HudEntity();

      this.root.addComponent(
        new TransformComponent({ position: new Vector2D(0, 0), rotation: 0, scale: 1 }),
      );

      this.hudEntity.addComponent(
        new RunnerHudComponent(() => ({
          score: this.score,
          gameOver: this.gameOver,
          fontFamily: this.assets?.fonts.ui.family,
        })),
      );

      this.root.addChild(this.camera);
      this.root.addChild(this.hudEntity);
      this.spawnRunner();
      this.root.awake();
    });
  }

  public override update(dt: number): void {
    EcsRuntime.runWith(this.runtime, () => {
      const restartPressed = this.runtime.input.isPressed("r") || this.runtime.input.isPressed("R");

      if (this.gameOver) {
        if (restartPressed) {
          this.eventBus.publish("restart_requested", {});
        }
        return;
      }

      this.cloudOffset += dt * 48;
      this.terrainOffset += dt * this.worldScrollSpeed;

      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawnIn) {
        this.spawnTimer = 0;
        this.spawnObstacle();
        this.nextSpawnIn = 0.8 + Math.random() * 0.7;
      }

      this.root?.update(dt);
      this.awardPointsForPassedObstacles();
      this.resolveRunnerVsObstacle();
      this.compactObstacles();
    });
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    EcsRuntime.runWith(this.runtime, () => {
      if (!this.camera || !this.renderSystem) return;
      this.camera.setViewport(this.canvas.size.x, this.canvas.size.y);
      this.renderBackground(ctx);
      this.renderSystem.render();
    });
  }

  public override destroy(): void {
    EcsRuntime.runWith(this.runtime, () => {
      for (const subId of this.subscriptions) {
        this.eventBus.unsubscribe(subId);
      }
      this.subscriptions.length = 0;

      this.root?.destroy();
      this.root = null;
      this.camera = null;
      this.renderSystem = null;
      this.hudEntity = null;
      this.runner = null;
      this.obstacles = [];

      this.assets?.release();
      this.runtime.registry.clear();
    });
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.assets) return;

    const color = this.assets.images.backgroundColor;
    const clouds = this.assets.images.backgroundClouds;
    const tileWidth = color.naturalWidth || color.width || 256;
    const tileHeight = color.naturalHeight || color.height || 256;
    const cloudWidth = clouds.naturalWidth || clouds.width || 256;
    const cloudHeight = clouds.naturalHeight || clouds.height || 256;

    // Sky base.
    ctx.fillStyle = "#c3e3ff";
    ctx.fillRect(0, 0, this.canvas.size.x, this.canvas.size.y);

    // Desert band anchored to terrain so it never "floats" above ground.
    const desertY = Math.floor(this.groundY - tileHeight);

    // Clouds parallax on a fixed horizon band.
    const cloudOffset = this.cloudOffset % cloudWidth;
    const cloudY = desertY - cloudHeight + 1; // +1px overlap avoids seams from alpha edges.
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let x = -cloudOffset - cloudWidth; x <= this.canvas.size.x + cloudWidth; x += cloudWidth) {
      ctx.drawImage(clouds, x, cloudY);
    }
    ctx.restore();

    const desertOffset = (this.cloudOffset * 0.4) % tileWidth;
    for (let x = -desertOffset - tileWidth; x <= this.canvas.size.x + tileWidth; x += tileWidth) {
      ctx.drawImage(color, x, desertY);
    }

    this.renderTerrain(ctx);
  }

  private renderTerrain(ctx: CanvasRenderingContext2D): void {
    if (!this.assets) return;

    const tiles = {
      top: this.assets.images.terrainTop,
      middle: this.assets.images.terrainMiddle,
      bottom: this.assets.images.terrainBottom,
    };
    const tileSize = 32;
    const yStart = Math.floor(this.groundY);
    const rows = Math.ceil((this.canvas.size.y - yStart) / tileSize);
    const cols = Math.ceil(this.canvas.size.x / tileSize) + 2;
    const xOffset = this.terrainOffset % tileSize;

    for (let row = 0; row < rows; row++) {
      const y = yStart + row * tileSize;
      const sprite = row === 0 ? tiles.top : row === rows - 1 ? tiles.bottom : tiles.middle;

      for (let col = 0; col < cols; col++) {
        const x = col * tileSize - xOffset - tileSize;
        ctx.drawImage(sprite, x, y, tileSize, tileSize);
      }
    }
  }

  private installEventHandlers(): void {
    this.subscriptions.push(
      this.eventBus.subscribe("score_changed", (e) => {
        this.score = e.payload.score;
        this.playSfx(this.assets?.audio.score);
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("runner_jumped", () => {
        this.playSfx(this.assets?.audio.jump);
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("runner_landed", () => {
        this.playSfx(this.assets?.audio.land);
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("game_over", () => {
        this.gameOver = true;
        this.playSfx(this.assets?.audio.hurt);
        if (this.runner) {
          this.runner.setDead(true);
          const body = this.runner.getBody();
          body.setVelocity(Vector2D.zero);
          body.setGravityScale(0);
          body.setBodyType(PhysicsBodyType.Static);
        }
        for (const obstacle of this.obstacles) {
          if (!obstacle.isAwake) continue;
          const body = obstacle.getBody();
          body.setVelocity(Vector2D.zero);
          body.setBodyType(PhysicsBodyType.Static);
        }
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("restart_requested", () => {
        this.resetRun();
      }),
    );
  }

  private spawnRunner(): void {
    const sprites = this.assets
      ? {
          idle: this.assets.images.runnerIdle,
          jump: this.assets.images.runnerJump,
          walkA: this.assets.images.runnerWalkA,
          walkB: this.assets.images.runnerWalkB,
          hit: this.assets.images.runnerHit,
        }
      : undefined;

    this.runner = new RunnerEntity(
      new Vector2D(this.runnerX, this.groundY - 32),
      this.groundY,
      this.eventBus,
      {
        sprites,
      },
    );
    this.root?.addChild(this.runner);
  }

  private spawnObstacle(options?: {
    position?: Vector2D;
    width?: number;
    height?: number;
    speed?: number;
  }): ObstacleEntity {
    const stackCount = options?.height
      ? Math.max(1, Math.min(3, Math.round(options.height / 28)))
      : ((1 + Math.floor(Math.random() * 3)) as 1 | 2 | 3);

    const width = options?.width ?? 32;
    const height = options?.height ?? stackCount * 32;
    const x = this.canvas.size.x + width;
    const y = this.groundY - height / 2;
    const spawnPos = options?.position ?? new Vector2D(x, y);
    const speed = options?.speed ?? this.worldScrollSpeed;

    const blockSprite = this.assets
      ? [
          this.assets.images.blockGreen,
          this.assets.images.blockYellow,
          this.assets.images.blockRed,
        ][Math.max(0, stackCount - 1)]
      : undefined;
    const obstacle = new ObstacleEntity(spawnPos, width, height, speed, {
      blockSprite,
      stackCount,
    });
    this.obstacles.push(obstacle);
    this.root?.addChild(obstacle);
    return obstacle;
  }

  private awardPointsForPassedObstacles(): void {
    if (!this.runner) return;

    const runnerLeft = this.runner.getCollider().bbox().x;
    for (const obstacle of this.obstacles) {
      if (!obstacle.isAwake || this.scoredObstacles.has(obstacle)) continue;

      const bbox = obstacle.getCollider().bbox();
      if (bbox.x + bbox.width < runnerLeft) {
        this.scoredObstacles.add(obstacle);
        this.eventBus.publish("score_changed", { score: this.score + 1 });
      }
    }
  }

  private resolveRunnerVsObstacle(): void {
    if (!this.runner) return;

    const runnerBbox = this.runner.getCollider().bbox();
    for (const obstacle of this.obstacles) {
      if (!obstacle.isAwake) continue;

      const obstacleBbox = obstacle.getCollider().bbox();
      const colliding =
        this.runner.getCollider().isColliding(obstacle.getCollider()) ||
        this.aabbOverlap(runnerBbox, obstacleBbox);
      if (!colliding) continue;

      // Set state directly to avoid any event subscription drift and keep HUD/gameplay in sync.
      this.gameOver = true;
      this.eventBus.publish("game_over", { score: this.score });
      break;
    }
  }

  private aabbOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  private compactObstacles(): void {
    this.obstacles = this.obstacles.filter((obstacle) => !obstacle._markForGc);
  }

  private resetRun(): void {
    this.gameOver = false;
    this.score = 0;
    this.spawnTimer = 0;
    this.nextSpawnIn = 1.1;
    this.scoredObstacles = new WeakSet<ObstacleEntity>();
    this.terrainOffset = 0;

    for (const obstacle of this.obstacles) {
      obstacle.destroy();
    }
    this.obstacles.length = 0;

    if (this.runner) {
      this.runner.destroy();
      this.runner = null;
    }

    this.spawnRunner();
  }

  private playSfx(audio?: HTMLAudioElement): void {
    if (!audio) return;
    const instance = audio.cloneNode(true) as HTMLAudioElement;
    instance.volume = 0.4;
    instance.currentTime = 0;
    void instance.play().catch(() => {
      // Ignore autoplay restrictions in dev/tests.
    });
  }

  public getScore(): number {
    return this.score;
  }

  public getObstacleCount(): number {
    return this.obstacles.length;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public getRunnerPositionForTest(): Vector2D {
    if (!this.runner) {
      return new Vector2D(this.runnerX, this.groundY - 32);
    }
    return this.runner.getPosition();
  }

  public spawnObstacleForTest(
    position: Vector2D,
    options?: { width?: number; height?: number; speed?: number },
  ): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.spawnObstacle({ position, ...options });
    });
  }

  public forceGameOverForTest(): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.eventBus.publish("game_over", { score: this.score });
    });
  }
}
