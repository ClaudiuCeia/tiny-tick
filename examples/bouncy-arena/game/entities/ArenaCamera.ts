import {
  CollisionEntity,
  Entity,
  RectangleCollisionShape,
  TransformComponent,
  Vector2D,
} from "../lib.ts";

export class ArenaCamera extends Entity {
  private readonly viewportCollider: CollisionEntity;

  constructor(width: number, height: number) {
    super();
    this.addComponent(
      new TransformComponent({ position: new Vector2D(0, 0), rotation: 0, scale: 1 }),
    );
    this.viewportCollider = new CollisionEntity(
      new RectangleCollisionShape(width, height),
      "top-left",
    );
    this.addChild(this.viewportCollider);
  }

  public override update(deltaTime: number): void {
    super.update(deltaTime);
  }

  public toCanvas(worldPos: Vector2D, _canvasSize: Vector2D): Vector2D {
    return worldPos.clone();
  }

  public setViewport(width: number, height: number): void {
    this.viewportCollider.resize(width, height);
  }
}
