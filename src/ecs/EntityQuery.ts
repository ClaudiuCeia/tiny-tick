import type { Component } from "./Component.ts";
import type { AbstractComponent, Entity } from "./Entity.ts";
import type { EntityRegistry } from "./EntityRegistry.ts";

type Constructor<T> = AbstractComponent<T> | { new (...args: unknown[]): T };

export type ComponentConstructor<C extends Component = Component> = Constructor<C>;
export type EntityConstructor<E extends Entity = Entity> = new (...args: unknown[]) => E;

/**
 * Cached ECS query with optional type narrowing and component filters.
 * Results are recomputed only when the registry version changes.
 */
export class EntityQuery<E extends Entity = Entity> {
  private readonly requiredComponents = new Set<ComponentConstructor>();
  private readonly excludedComponents = new Set<ComponentConstructor>();
  private lastResolvedVersion = -1;
  private cached: E[] = [];

  constructor(
    private readonly registry: EntityRegistry,
    private readonly entityType?: EntityConstructor<E>,
  ) {}

  public with<C extends Component>(...constructors: ComponentConstructor<C>[]): this {
    for (const constr of constructors) {
      this.requiredComponents.add(constr);
    }
    this.invalidate();
    return this;
  }

  public without<C extends Component>(...constructors: ComponentConstructor<C>[]): this {
    for (const constr of constructors) {
      this.excludedComponents.add(constr);
    }
    this.invalidate();
    return this;
  }

  public clearFilters(): this {
    this.requiredComponents.clear();
    this.excludedComponents.clear();
    this.invalidate();
    return this;
  }

  /**
   * Returns true when the registry changed since the last resolved query result.
   */
  public hasChanged(): boolean {
    return this.registry.version !== this.lastResolvedVersion;
  }

  public run(): E[] {
    if (!this.hasChanged()) {
      return this.cached;
    }

    const base = this.entityType
      ? this.registry.getEntitiesByType(this.entityType)
      : (this.registry.getAllEntities() as E[]);

    this.cached = base.filter((entity) => {
      for (const required of this.requiredComponents) {
        if (!entity.hasComponent(required)) return false;
      }
      for (const excluded of this.excludedComponents) {
        if (entity.hasComponent(excluded)) return false;
      }
      return true;
    });
    this.lastResolvedVersion = this.registry.version;

    return this.cached;
  }

  public invalidate(): void {
    this.lastResolvedVersion = -1;
  }
}
