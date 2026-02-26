import { EntityRegistry } from "./EntityRegistry.ts";
import { InputManager } from "../input/Input.ts";
import { AssetManager } from "../assets/AssetManager.ts";
import { PersistenceLoader, PersistenceRegistry, StateStore } from "../state/index.ts";
import type { LoadOptions, LoadResult, PersistFactory, Snapshot } from "../state/index.ts";
import type { PersistableClass } from "../state/PersistedType.ts";

/**
 * Runtime context that scopes ECS global state.
 */
export class EcsRuntime {
  private static current = new EcsRuntime(new EntityRegistry());

  constructor(
    public readonly registry: EntityRegistry = new EntityRegistry(),
    public readonly input: InputManager = new InputManager(),
    public readonly assets: AssetManager = new AssetManager(),
    public readonly store: StateStore = new StateStore(),
    public readonly persistenceRegistry: PersistenceRegistry = new PersistenceRegistry(),
    public readonly persistenceLoader: PersistenceLoader = new PersistenceLoader(
      persistenceRegistry,
    ),
  ) {}

  public registerPersistedEntity(type: string, factory: PersistFactory): void;
  public registerPersistedEntity(klass: PersistableClass, factory: PersistFactory): void;
  public registerPersistedEntity(
    typeOrClass: string | PersistableClass,
    factory: PersistFactory,
  ): void {
    if (typeof typeOrClass === "string") {
      this.persistenceRegistry.registerEntity(typeOrClass, factory);
      return;
    }
    this.persistenceRegistry.registerEntity(typeOrClass, factory);
  }

  public registerPersistedComponent(type: string, factory: PersistFactory): void;
  public registerPersistedComponent(klass: PersistableClass, factory: PersistFactory): void;
  public registerPersistedComponent(
    typeOrClass: string | PersistableClass,
    factory: PersistFactory,
  ): void {
    if (typeof typeOrClass === "string") {
      this.persistenceRegistry.registerComponent(typeOrClass, factory);
      return;
    }
    this.persistenceRegistry.registerComponent(typeOrClass, factory);
  }

  public loadSnapshot(snapshot: Snapshot, options: LoadOptions = {}): LoadResult {
    const restoreResult = this.store.restore(snapshot, { strict: options.strict });
    if (!restoreResult.ok) {
      return restoreResult;
    }

    return this.persistenceLoader.loadIntoRuntime(snapshot, this, options);
  }

  public static getCurrent(): EcsRuntime {
    return this.current;
  }

  public static setCurrent(runtime: EcsRuntime): EcsRuntime {
    const previous = this.current;
    this.current = runtime;
    return previous;
  }

  public static runWith<T>(runtime: EcsRuntime, fn: () => T): T {
    const previous = this.setCurrent(runtime);
    try {
      return fn();
    } finally {
      this.setCurrent(previous);
    }
  }

  /** Reset current runtime to a fresh, isolated runtime. */
  public static reset(): void {
    this.current = new EcsRuntime(new EntityRegistry());
  }
}
