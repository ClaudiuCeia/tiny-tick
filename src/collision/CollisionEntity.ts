import { Entity } from "../ecs/Entity.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { CollisionShapeComponent } from "./CollisionShapeComponent.ts";
import type { CollisionShape, CollisionAnchor } from "./CollisionShape.ts";

export class CollisionEntity extends Entity {
  public isCollidingWithPlayer = false;
  public isCollidingWith: CollisionEntity[] = [];

  constructor(
    public readonly shape: CollisionShape,
    private anchorPoint: CollisionAnchor = "center",
    public layer: number = 1,
    public collisionMask: number = 0xffffffff,
  ) {
    super();
  }

  public override awake(): void {
    super.awake();
    this.addComponent(
      new TransformComponent({ position: new Vector2D(0, 0), rotation: 0, scale: 1 }),
    );
    this.addComponent(new CollisionShapeComponent(this.shape, this.anchorPoint));
  }

  public override update(_dt: number): void {}

  public bbox(): { x: number; y: number; width: number; height: number } {
    const sc = this.getComponent(CollisionShapeComponent);
    const t = this.getComponent(TransformComponent);
    return sc.shape.getAABB(t.globalTransform, sc.anchorPoint);
  }

  public isColliding(other: CollisionEntity): boolean {
    if (!this.canCollideWith(other)) return false;

    const scA = this.getComponent(CollisionShapeComponent);
    const scB = other.getComponent(CollisionShapeComponent);
    const tA = this.getComponent(TransformComponent).globalTransform;
    const tB = other.getComponent(TransformComponent).globalTransform;
    return scA.shape.isCollidingWith(scB.shape, tA, scA.anchorPoint, tB, scB.anchorPoint);
  }

  public getCollisionNormal(other: CollisionEntity): Vector2D | null {
    if (!this.canCollideWith(other)) return null;

    const scA = this.getComponent(CollisionShapeComponent);
    const scB = other.getComponent(CollisionShapeComponent);
    const tA = this.getComponent(TransformComponent).globalTransform;
    const tB = other.getComponent(TransformComponent).globalTransform;
    return scA.shape.getCollisionNormal(scB.shape, tA, scA.anchorPoint, tB, scB.anchorPoint);
  }

  public resize(...args: number[]): this {
    this.getComponent(CollisionShapeComponent).shape.resize(...args);
    return this;
  }

  public containsPoint(point: Vector2D): boolean {
    const sc = this.getComponent(CollisionShapeComponent);
    const t = this.getComponent(TransformComponent).globalTransform;
    return sc.shape.containsPoint(point, t, sc.anchorPoint);
  }

  public setAnchorPoint(anchorPoint: CollisionAnchor): this {
    this.getComponent(CollisionShapeComponent).anchorPoint = anchorPoint;
    return this;
  }

  public getAnchorPoint(): CollisionAnchor {
    return this.getComponent(CollisionShapeComponent).anchorPoint;
  }

  public setCollisionLayer(layer: number): this {
    this.layer = layer;
    return this;
  }

  public setCollisionMask(mask: number): this {
    this.collisionMask = mask;
    return this;
  }

  public canCollideWith(other: CollisionEntity): boolean {
    return (this.collisionMask & other.layer) !== 0 && (other.collisionMask & this.layer) !== 0;
  }
}
