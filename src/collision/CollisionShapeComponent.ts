import { Component } from "../ecs/Component.ts";
import type { CollisionEntity } from "./CollisionEntity.ts";
import type { CollisionShape, CollisionAnchor } from "./CollisionShape.ts";

export class CollisionShapeComponent extends Component<CollisionEntity> {
  constructor(
    public shape: CollisionShape,
    public anchorPoint: CollisionAnchor = "center",
  ) {
    super();
  }

  public override awake(): void {}
  public override update(_dt: number): void {}
}
