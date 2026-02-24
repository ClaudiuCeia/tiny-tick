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

  private readonly groundY = 450;
  private readonly runnerX = 120;

  constructor(
    private readonly runtime: EcsRuntime,
    private readonly canvas: ICanvas,
  ) {
    super();
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

  public override render(_ctx: CanvasRenderingContext2D): void {
    EcsRuntime.runWith(this.runtime, () => {
      if (!this.camera || !this.renderSystem) return;
      this.camera.setViewport(this.canvas.size.x, this.canvas.size.y);
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

      this.runtime.registry.clear();
    });
  }

  private installEventHandlers(): void {
    this.subscriptions.push(
      this.eventBus.subscribe("score_changed", (e) => {
        this.score = e.payload.score;
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("game_over", () => {
        this.gameOver = true;
        if (this.runner) {
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
    this.runner = new RunnerEntity(new Vector2D(this.runnerX, this.groundY - 21), this.groundY);
    this.root?.addChild(this.runner);
  }

  private spawnObstacle(options?: {
    position?: Vector2D;
    width?: number;
    height?: number;
    speed?: number;
  }): ObstacleEntity {
    const width = options?.width ?? 20 + Math.floor(Math.random() * 18);
    const height = options?.height ?? 28 + Math.floor(Math.random() * 40);
    const x = this.canvas.size.x + width;
    const y = this.groundY - height / 2;
    const spawnPos = options?.position ?? new Vector2D(x, y);
    const speed = options?.speed ?? 260;

    const obstacle = new ObstacleEntity(spawnPos, width, height, speed);
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

    for (const obstacle of this.obstacles) {
      if (!obstacle.isAwake) continue;
      if (!this.runner.getCollider().isColliding(obstacle.getCollider())) continue;
      this.eventBus.publish("game_over", { score: this.score });
      break;
    }
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
      return new Vector2D(this.runnerX, this.groundY - 21);
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
