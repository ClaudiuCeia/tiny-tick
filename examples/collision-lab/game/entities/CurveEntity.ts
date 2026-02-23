import {
  CollisionEntity,
  CurveCollisionShape,
  Entity,
  TransformComponent,
  Vector2D,
} from "../lib.ts";
import { CurveRenderComponent } from "../components/CurveRenderComponent.ts";

export class CurveEntity extends Entity {
  private readonly collider: CollisionEntity;

  constructor(width: number, baseY: number) {
    super();

    this.addComponent(
      new TransformComponent({
        position: new Vector2D(0, baseY),
        rotation: 0,
        scale: 1,
      }),
    );

    this.addComponent(new CurveRenderComponent(width));

    const shape = new CurveCollisionShape((x) => Math.sin(x * 0.015) * 24 + 12, width);
    this.collider = new CollisionEntity(shape, "top-left", 0b1000, 0xffffffff);
    this.addChild(this.collider);
  }

  public override update(dt: number): void {
    super.update(dt);
  }

  public getCollider(): CollisionEntity {
    return this.collider;
  }
}
