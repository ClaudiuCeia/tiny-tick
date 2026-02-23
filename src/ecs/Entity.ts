import type { IWithUpdate, IAwakable } from "./lifecycle.ts";
import type { Component } from "./Component.ts";
import { EntityRegistry } from "./EntityRegistry.ts";
import { EcsRuntime } from "./EcsRuntime.ts";

export type AbstractComponent<T> = Function & { prototype: T };
type Constructor<T> = AbstractComponent<T> | { new (...args: unknown[]): T };

export abstract class Entity implements IWithUpdate, IAwakable {
  private _componentMap: Map<Function, Component> = new Map();
  private _childMap: Map<Function, Entity[]> = new Map();

  protected _components: Component[] = [];
  private _isAwake: boolean = false;
  private _parent: Entity | null = null;
  private _children: Entity[] = [];
  public readonly id: string = crypto.randomUUID();
  private readonly _runtime: EcsRuntime;

  public _markForGc: boolean = false;

  constructor() {
    this._runtime = EcsRuntime.getCurrent();
    this._runtime.registry.register(this);
  }

  public awake(): void {
    if (this._isAwake) {
      return;
    }
    this._isAwake = true;

    for (const component of this._components) {
      component.awake();
    }
    for (const child of this._children) {
      if (!child._isAwake) {
        child.awake();
      }
    }
  }

  public update(deltaTime: number): void {
    for (const component of this._components) {
      component.update(deltaTime);
    }
    for (const child of this._children) {
      child.update(deltaTime);
    }
  }

  public get components(): Component[] {
    return this._components;
  }

  public addComponent(component: Component): void {
    if (this._components.length >= 100) {
      console.warn(
        `${this.constructor.name} has ${this._components.length} components, now adding ${component.constructor.name}`,
      );
    }

    if (this.hasComponent(component.constructor)) {
      throw new Error(
        `Component ${component.constructor.name} already exists on ${this.constructor.name}`,
      );
    }

    this._componentMap.set(component.constructor, component);
    this._components.push(component);
    component.entity = this;

    if (this._isAwake && component.awake) {
      component.awake();
    }
  }

  public getComponent<C extends Component>(constr: Constructor<C>): C {
    const component = this._componentMap.get(constr);
    if (component) {
      return component as C;
    }
    throw new Error(`Component ${(constr as any).name} not found on ${this.constructor.name}`);
  }

  public removeComponent<C extends Component>(constr: Constructor<C>): void {
    this._componentMap.delete(constr);

    let toRemove: Component | undefined;
    let index: number | undefined;

    for (let i = 0; i < this._components.length; i++) {
      const component = this._components[i];
      if (component instanceof (constr as any)) {
        toRemove = component;
        index = i;
        break;
      }
    }

    if (toRemove && index !== undefined) {
      toRemove.entity = undefined;
      this._components.splice(index, 1);
    }
  }

  public hasComponent<C extends Component>(constr: Constructor<C>): boolean {
    return this._componentMap.has(constr);
  }

  public addChild(entity: Entity): void {
    if (entity.runtime !== this.runtime) {
      throw new Error(
        `Cannot parent ${entity.constructor.name} across runtimes. ` +
          `Parent runtime and child runtime must match.`,
      );
    }

    if (this._children.includes(entity)) {
      console.warn(`${entity.constructor.name} is already a child of ${this.constructor.name}`);
      return;
    }

    if (this._children.length >= 200) {
      console.warn(
        `${this.constructor.name} has ${this._children.length} children, now adding ${entity.constructor.name}`,
      );
    }

    if (entity._parent) {
      entity._parent.removeChild(entity);
    }

    this._children.push(entity);
    entity._parent = this;

    const list = this._childMap.get(entity.constructor) ?? [];
    list.push(entity);
    this._childMap.set(entity.constructor, list);

    if (this._isAwake && !entity._isAwake) {
      entity.awake();
    }
  }

  public removeChild(cb: (child: Entity) => boolean): void;
  public removeChild(entity: Entity): void;
  public removeChild(entityOrCb: Entity | ((child: Entity) => boolean)): void {
    let entity: Entity | null = null;
    if (typeof entityOrCb === "function") {
      const entities = this._children.filter(entityOrCb);
      if (entities.length === 0) {
        // No match — entity stays null, null guard below returns early
        entity = entities[0] ?? null;
      } else {
        for (const child of entities) {
          this.removeChild(child);
        }
        return;
      }
    } else {
      entity = entityOrCb;
    }

    if (!entity) {
      return;
    }

    const index = this._children.findIndex((e) => e.id === entity!.id);
    if (index !== -1) {
      this._children.splice(index, 1);
      entity._parent = null;

      const list = this._childMap.get(entity.constructor);
      if (list) {
        const i = list.indexOf(entity);
        if (i !== -1) {
          list.splice(i, 1);
          if (list.length === 0) {
            this._childMap.delete(entity.constructor);
          }
        }
      }

      if (entity._isAwake) {
        entity.destroy();
      }
    }
  }

  public removeAllChildren(): void {
    this.removeChild(() => true);
  }

  public get children(): Entity[] {
    return this._children;
  }

  public getChild<C extends Entity>(constr: Constructor<C>): C | null {
    const list = this._childMap.get(constr);
    return (list?.[0] as C) ?? null;
  }

  public getChildById(id: string): Entity | null {
    for (const child of this._children) {
      if (child.id === id) return child;
    }
    return null;
  }

  public getChildren<C extends Entity>(constr: Constructor<C>): C[] {
    return (this._childMap.get(constr) as C[] | undefined) ?? [];
  }

  public get parent(): Entity | null {
    return this._parent;
  }

  public getRoot(): Entity {
    if (!this.parent) return this;
    return this.parent.getRoot();
  }

  public get isAwake(): boolean {
    return this._isAwake;
  }

  public destroy(): void {
    this._markForGc = true;
    this._isAwake = false;

    if (this._parent) {
      this._parent.removeChild(this);
    }

    this._runtime.registry.unregister(this);

    while (this._children.length > 0) {
      this._children[0]!.destroy();
    }
    this._children.length = 0;

    for (const component of this._components) {
      component.destroy?.();
      component.entity = undefined;
    }
    this._components = [];
  }

  public static getRegistry(): EntityRegistry {
    return EcsRuntime.getCurrent().registry;
  }

  public get runtime(): EcsRuntime {
    return this._runtime;
  }

  public printHeritageChain(): void {
    let current: Entity | null = this.parent;
    const chain: string[] = [this.constructor.name];
    while (current) {
      chain.push(current.constructor.name);
      current = current.parent;
    }
    console.log("Heritage chain:", chain.reverse().join(" -> "));
  }

  public getOldestAncestor(): Entity {
    return this.getRoot();
  }
}
