import { getPersistedType, type PersistableClass } from "./PersistedType.ts";

export type PersistFactory<T = unknown> = (node: unknown) => T;

export class PersistenceRegistry {
  private readonly entities = new Map<string, PersistFactory>();
  private readonly components = new Map<string, PersistFactory>();

  public registerEntity(type: string, factory: PersistFactory): void;
  public registerEntity(klass: PersistableClass, factory: PersistFactory): void;
  public registerEntity(typeOrClass: string | PersistableClass, factory: PersistFactory): void {
    const type =
      typeof typeOrClass === "string" ? typeOrClass : getPersistedType(typeOrClass, "entity");

    if (this.entities.has(type)) {
      throw new Error(`Duplicate persisted entity type: ${type}`);
    }
    this.entities.set(type, factory);
  }

  public registerComponent(type: string, factory: PersistFactory): void;
  public registerComponent(klass: PersistableClass, factory: PersistFactory): void;
  public registerComponent(typeOrClass: string | PersistableClass, factory: PersistFactory): void {
    const type =
      typeof typeOrClass === "string" ? typeOrClass : getPersistedType(typeOrClass, "component");

    if (this.components.has(type)) {
      throw new Error(`Duplicate persisted component type: ${type}`);
    }
    this.components.set(type, factory);
  }

  public getEntityFactory(type: string): PersistFactory | undefined {
    return this.entities.get(type);
  }

  public getComponentFactory(type: string): PersistFactory | undefined {
    return this.components.get(type);
  }

  public clear(): void {
    this.entities.clear();
    this.components.clear();
  }
}
