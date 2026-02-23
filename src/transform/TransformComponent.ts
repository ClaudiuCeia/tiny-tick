import { Entity } from "../ecs/Entity.ts";
import { Component } from "../ecs/Component.ts";
import { Vector2D } from "../math/Vector2D.ts";

type radians = number;

export type Transform = {
  position: Vector2D;
  rotation: radians;
  scale: number;
};

export class TransformComponent extends Component {
  constructor(
    private _transform: Transform = {
      position: new Vector2D(0, 0),
      rotation: 0,
      scale: 1,
    },
    public parent: TransformComponent | null = null,
  ) {
    super();
  }

  public get transform(): Transform {
    return this._transform;
  }

  /** World-space transform, accounting for parent rotation and scale. */
  public get globalTransform(): Transform {
    if (!this.parent) {
      return this._transform;
    }

    const parent = this.parent.globalTransform;

    const sin = Math.sin(parent.rotation);
    const cos = Math.cos(parent.rotation);

    const localX = this._transform.position.x * parent.scale;
    const localY = this._transform.position.y * parent.scale;

    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;

    return {
      position: new Vector2D(parent.position.x + rotatedX, parent.position.y + rotatedY),
      rotation: parent.rotation + this._transform.rotation,
      scale: parent.scale * this._transform.scale,
    };
  }

  public override awake(): void {
    if (!this.parent) {
      const entParent = this.entity?.parent;
      if (entParent && entParent.hasComponent(TransformComponent)) {
        this.parent = entParent.getComponent(TransformComponent);
      }
    }
  }

  public override update(_deltaTime: number): void {}

  public translate(x: number, y: number): TransformComponent {
    this._transform.position.x += x;
    this._transform.position.y += y;
    return this;
  }

  public rotate(angle: radians): TransformComponent {
    this._transform.rotation += angle;
    return this;
  }

  public scaleBy(factor: number): TransformComponent {
    this._transform.scale *= factor;
    return this;
  }

  public setPosition(position: Vector2D): TransformComponent;
  public setPosition(x: number, y: number): TransformComponent;
  public setPosition(xOrPosition: number | Vector2D, y?: number): TransformComponent {
    if (typeof xOrPosition === "number") {
      if (y === undefined) throw new Error("y must be provided when x is a number");
      this._transform.position.x = xOrPosition;
      this._transform.position.y = y;
    } else {
      this._transform.position.x = xOrPosition.x;
      this._transform.position.y = xOrPosition.y;
    }
    return this;
  }

  public setRotation(angle: radians): TransformComponent {
    this._transform.rotation = angle;
    return this;
  }

  public setScale(scale: number): TransformComponent {
    this._transform.scale = scale;
    return this;
  }

  /**
   * Returns the world-space position.
   * Uses globalTransform, which correctly accounts for parent rotation.
   */
  public getGlobalPosition(): Vector2D {
    return this.globalTransform.position;
  }

  public anchorTo(entity: Entity): TransformComponent;
  public anchorTo(transform: TransformComponent): TransformComponent;
  public anchorTo(entityOrTransform: Entity | TransformComponent): TransformComponent {
    if (entityOrTransform instanceof Entity) {
      if (!entityOrTransform.hasComponent(TransformComponent)) {
        throw new Error("Entity does not have a TransformComponent");
      }
      this.parent = entityOrTransform.getComponent(TransformComponent);
    } else {
      this.parent = entityOrTransform;
    }
    return this;
  }

  public unanchor(): TransformComponent {
    this.parent = null;
    return this;
  }

  public printAnchorChain(): void {
    let current: TransformComponent | null = this;
    const chain: string[] = [];
    while (current) {
      const { position, rotation, scale } = current._transform;
      chain.push(`(${position.x}, ${position.y}) r=${rotation} s=${scale}`);
      current = current.parent;
    }
    console.log("Anchor chain:", chain.reverse().join(" -> "));
  }
}
