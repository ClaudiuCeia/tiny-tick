import type { Entity } from "./Entity.ts";
import type { IComponent } from "./IComponent.ts";

export abstract class Component<T extends Entity = Entity> implements IComponent {
  public entity: T | undefined;

  constructor() {}

  public get ent(): T {
    if (!this.entity) {
      throw new Error("Entity is not set");
    }
    return this.entity;
  }

  public awake(): void {}
  public update(_deltaTime: number): void {}
  public destroy(): void {}
}
