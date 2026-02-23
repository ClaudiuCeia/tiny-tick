import type { IWithUpdate, IAwakable } from "./lifecycle.ts";
import type { Entity } from "./Entity.ts";

export interface IComponent extends IWithUpdate, IAwakable {
  entity?: Entity;
  update(deltaTime: number): void;
}
