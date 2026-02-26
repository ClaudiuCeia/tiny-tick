import type { Entity } from "./Entity.ts";
import type { IComponent } from "./IComponent.ts";
import { Atom } from "../state/Atom.ts";
import { RefAtom } from "../state/RefAtom.ts";
import { getPersistedType } from "../state/PersistedType.ts";

export abstract class Component<T extends Entity = Entity> implements IComponent {
  public entity: T | undefined;
  protected _storeHandles: Array<Atom<unknown> | RefAtom<object | null>> = [];

  constructor() {}

  public get ent(): T {
    if (!this.entity) {
      throw new Error("Entity is not set");
    }
    return this.entity;
  }

  public atom<V>(name: string, defaultValue: V): Atom<V> {
    const handle = new Atom(name, defaultValue);
    this._storeHandles.push(handle as Atom<unknown>);
    return handle;
  }

  public ref<V extends object | null>(name: string, defaultValue: V): RefAtom<V> {
    const handle = new RefAtom(name, defaultValue);
    this._storeHandles.push(handle as RefAtom<object | null>);
    return handle;
  }

  public _bindStoreHandles(): void {
    if (!this.entity || this._storeHandles.length === 0) {
      return;
    }
    const componentType = getPersistedType(
      this.constructor as Function & { type?: unknown },
      "component",
    );
    const store = this.entity.runtime.store;
    const entityId = this.entity.id;

    for (const handle of this._storeHandles) {
      const key = `${entityId}:${componentType}:${handle.name}`;
      handle._bind(store, key, true);
    }
  }

  public _unbindStoreHandles(): void {
    for (const handle of this._storeHandles) {
      handle._unbind();
    }
  }

  public awake(): void {}
  public update(_deltaTime: number): void {}
  public destroy(): void {}
}
