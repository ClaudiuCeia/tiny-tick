import {
  EcsRuntime,
  Entity,
  RenderSystem,
  Scene,
  TransformComponent,
  Vector2D,
  type ICanvas,
} from "../lib.ts";
import { createArenaEventBus } from "../events.ts";
import { ArenaHudComponent } from "../components/ArenaHudComponent.ts";
import { ArenaCamera } from "../entities/ArenaCamera.ts";
import { BulletEntity } from "../entities/BulletEntity.ts";
import { EnemyEntity } from "../entities/EnemyEntity.ts";
import { PlayerEntity } from "../entities/PlayerEntity.ts";

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

export class ArenaScene extends Scene {
  private readonly eventBus = createArenaEventBus();
  private root: WorldRoot | null = null;
  private camera: ArenaCamera | null = null;
  private renderSystem: RenderSystem | null = null;
  private hudEntity: HudEntity | null = null;

  private player: PlayerEntity | null = null;
  private bullets: BulletEntity[] = [];
  private enemies: EnemyEntity[] = [];

  private score = 0;
  private hp = 3;
  private gameOver = false;
  private enemySpawnTimer = 0;
  private playerHitCooldown = 0;
  private readonly subscriptions: string[] = [];

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
      this.camera = new ArenaCamera(this.canvas.size.x, this.canvas.size.y);
      this.renderSystem = new RenderSystem(this.canvas, this.camera, this.runtime);
      this.hudEntity = new HudEntity();

      this.root.addComponent(
        new TransformComponent({ position: new Vector2D(0, 0), rotation: 0, scale: 1 }),
      );

      this.hudEntity.addComponent(
        new ArenaHudComponent(() => ({
          score: this.score,
          hp: this.hp,
          gameOver: this.gameOver,
        })),
      );

      this.root.addChild(this.camera);
      this.root.addChild(this.hudEntity);
      this.spawnPlayer();
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

      this.enemySpawnTimer += dt;
      if (this.enemySpawnTimer >= 0.85) {
        this.enemySpawnTimer = 0;
        this.spawnEnemy();
      }

      this.playerHitCooldown = Math.max(0, this.playerHitCooldown - dt);
      this.root?.update(dt);
      this.clampPlayerToArena();
      this.resolveBulletVsEnemy();
      this.resolveEnemyVsPlayer();
      this.compactLists();
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
      this.hudEntity = null;
      this.renderSystem = null;
      this.runtime.registry.clear();
    });
  }

  private installEventHandlers(): void {
    this.subscriptions.push(
      this.eventBus.subscribe("enemy_killed", (e) => {
        this.score = e.payload.score;
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("player_damaged", (e) => {
        this.hp = e.payload.hp;
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("game_over", () => {
        this.gameOver = true;
      }),
    );
    this.subscriptions.push(
      this.eventBus.subscribe("restart_requested", () => {
        this.resetRound();
      }),
    );
  }

  private spawnPlayer(): void {
    const start = new Vector2D(this.canvas.size.x / 2, this.canvas.size.y / 2);
    this.player = new PlayerEntity(start, (position, direction) => {
      this.spawnBullet(position, direction);
    });
    this.root?.addChild(this.player);
  }

  private spawnEnemy(position?: Vector2D): EnemyEntity {
    const spawnPos = position ?? this.randomEnemyEdgeSpawn();
    const enemy = new EnemyEntity(spawnPos, 90, () => this.getPlayerPosition());
    this.enemies.push(enemy);
    this.root?.addChild(enemy);
    return enemy;
  }

  private spawnBullet(position: Vector2D, direction: Vector2D): void {
    if (this.gameOver) return;

    const spawn = position.add(direction.normalize().multiply(24));
    const bullet = new BulletEntity(spawn, direction, {
      width: this.canvas.size.x,
      height: this.canvas.size.y,
    });
    this.bullets.push(bullet);
    this.root?.addChild(bullet);
  }

  private clampPlayerToArena(): void {
    if (!this.player) return;
    const transform = this.player.getComponent(TransformComponent);
    const pos = transform.transform.position;
    pos.x = Math.max(14, Math.min(this.canvas.size.x - 14, pos.x));
    pos.y = Math.max(14, Math.min(this.canvas.size.y - 14, pos.y));
  }

  private resolveBulletVsEnemy(): void {
    for (const bullet of this.bullets) {
      if (!bullet.isAwake) continue;
      for (const enemy of this.enemies) {
        if (!enemy.isAwake) continue;
        if (!bullet.getCollider().isColliding(enemy.getCollider())) continue;

        bullet.destroy();
        enemy.destroy();
        this.eventBus.publish("enemy_killed", { score: this.score + 1 });
        break;
      }
    }
  }

  private resolveEnemyVsPlayer(): void {
    if (!this.player || this.playerHitCooldown > 0 || this.gameOver) return;

    for (const enemy of this.enemies) {
      if (!enemy.isAwake) continue;
      if (!enemy.getCollider().isColliding(this.player.getCollider())) continue;

      this.playerHitCooldown = 0.75;
      this.eventBus.publish("player_damaged", { hp: Math.max(0, this.hp - 1) });
      if (this.hp <= 1) {
        this.eventBus.publish("game_over", { score: this.score });
      }
      break;
    }
  }

  private compactLists(): void {
    this.bullets = this.bullets.filter((bullet) => !bullet._markForGc);
    this.enemies = this.enemies.filter((enemy) => !enemy._markForGc);
  }

  private randomEnemyEdgeSpawn(): Vector2D {
    const side = Math.floor(Math.random() * 4);
    const width = this.canvas.size.x;
    const height = this.canvas.size.y;

    if (side === 0) return new Vector2D(0, Math.random() * height);
    if (side === 1) return new Vector2D(width, Math.random() * height);
    if (side === 2) return new Vector2D(Math.random() * width, 0);
    return new Vector2D(Math.random() * width, height);
  }

  private getPlayerPosition(): Vector2D {
    if (!this.player) {
      return new Vector2D(this.canvas.size.x / 2, this.canvas.size.y / 2);
    }
    return this.player.position;
  }

  private resetRound(): void {
    this.score = 0;
    this.hp = 3;
    this.gameOver = false;
    this.enemySpawnTimer = 0;
    this.playerHitCooldown = 0;

    for (const bullet of this.bullets) bullet.destroy();
    for (const enemy of this.enemies) enemy.destroy();
    this.bullets.length = 0;
    this.enemies.length = 0;

    if (this.player) {
      this.player.destroy();
      this.player = null;
    }

    this.spawnPlayer();
  }

  public getScore(): number {
    return this.score;
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public getPlayerHp(): number {
    return this.hp;
  }

  public spawnEnemyForTest(position: Vector2D): EnemyEntity {
    let spawned: EnemyEntity | null = null;
    EcsRuntime.runWith(this.runtime, () => {
      spawned = this.spawnEnemy(position);
    });
    if (!spawned) {
      throw new Error("Failed to spawn test enemy");
    }
    return spawned;
  }

  public getPlayerPositionForTest(): Vector2D {
    return this.getPlayerPosition();
  }

  public forceGameOverForTest(): void {
    EcsRuntime.runWith(this.runtime, () => {
      this.eventBus.publish("game_over", { score: this.score });
    });
  }
}
