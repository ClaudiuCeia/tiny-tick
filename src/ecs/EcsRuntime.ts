import { EntityRegistry } from "./EntityRegistry.ts";
import { InputManager } from "../input/Input.ts";

/**
 * Runtime context that scopes ECS global state.
 */
export class EcsRuntime {
  private static current = new EcsRuntime(new EntityRegistry());

  constructor(
    public readonly registry: EntityRegistry = new EntityRegistry(),
    public readonly input: InputManager = new InputManager(),
  ) {}

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
