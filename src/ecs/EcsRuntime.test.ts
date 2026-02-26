import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Entity } from "./Entity.ts";
import { EntityRegistry } from "./EntityRegistry.ts";
import { EcsRuntime } from "./EcsRuntime.ts";
import { Component } from "./Component.ts";

class Node extends Entity {}
class PersistedNode extends Entity {
  public static type = "persisted-node";
}
class PersistedHealth extends Component {
  public static type = "persisted-health";
  hp = this.atom("hp", 100);
}

class Targeter extends Component {
  public static type = "targeter";
  target = this.ref<Entity | null>("target", null);
}

class PersistedWithTarget extends Entity {
  public static type = "persisted-with-target";

  public constructor() {
    super();
    this.addComponent(new Targeter());
  }
}

beforeEach(() => {
  EcsRuntime.reset();
});

afterEach(() => {
  EcsRuntime.reset();
});

describe("EcsRuntime", () => {
  test("default runtime starts with a fresh registry", () => {
    const e = new Node();
    expect(EcsRuntime.getCurrent().registry.getEntityById(e.id)).toBe(e);
  });

  test("runWith isolates entities to the selected runtime registry", () => {
    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    const a = EcsRuntime.runWith(runtimeA, () => new Node());
    const b = EcsRuntime.runWith(runtimeB, () => new Node());

    expect(runtimeA.registry.getEntityById(a.id)).toBe(a);
    expect(runtimeA.registry.getEntityById(b.id)).toBeUndefined();
    expect(runtimeB.registry.getEntityById(b.id)).toBe(b);
    expect(runtimeB.registry.getEntityById(a.id)).toBeUndefined();
    expect(EcsRuntime.getCurrent().registry.count).toBe(0);
  });

  test("entity unregisters from its creation runtime even after current runtime changes", () => {
    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    const a = EcsRuntime.runWith(runtimeA, () => new Node());
    EcsRuntime.setCurrent(runtimeB);

    a.destroy();

    expect(runtimeA.registry.getEntityById(a.id)).toBeUndefined();
  });

  test("addChild across different runtimes throws", () => {
    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    const parent = EcsRuntime.runWith(runtimeA, () => new Node());
    const child = EcsRuntime.runWith(runtimeB, () => new Node());

    expect(() => parent.addChild(child)).toThrow("across runtimes");
  });

  test("runtime has isolated store and persistence services", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    expect(runtime.store.snapshot().version).toBe(1);
    expect(runtime.persistenceRegistry).toBeDefined();
    expect(runtime.persistenceLoader).toBeDefined();
  });

  test("registerPersistedEntity and registerPersistedComponent forward to runtime registry", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const entityFactory = () => new PersistedNode();
    const componentFactory = () => new PersistedHealth();

    runtime.registerPersistedEntity(PersistedNode, entityFactory);
    runtime.registerPersistedComponent(PersistedHealth, componentFactory);

    expect(runtime.persistenceRegistry.getEntityFactory("persisted-node")).toBe(entityFactory);
    expect(runtime.persistenceRegistry.getComponentFactory("persisted-health")).toBe(
      componentFactory,
    );
  });

  test("loadSnapshot restores store and loads entities via registered factories", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    class PersistedWithHealth extends Entity {
      public static type = "persisted-with-health";

      public constructor() {
        super();
        this.addComponent(new PersistedHealth());
      }
    }

    runtime.registerPersistedEntity(PersistedWithHealth, () => new PersistedWithHealth());

    const result = runtime.loadSnapshot({
      version: 1,
      rootSid: "e1",
      entities: [{ sid: "e1", type: "persisted-with-health", parentSid: null }],
      atoms: { "e1:persisted-health:hp": 80 },
    });

    expect(result).toEqual({ ok: true, errors: [] });
    const entities = runtime.registry.getEntitiesByType(PersistedWithHealth);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.getComponent(PersistedHealth).hp.get()).toBe(80);
  });

  test("loadSnapshot hydrates entity refs end-to-end", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    runtime.registerPersistedEntity(PersistedWithTarget, () => new PersistedWithTarget());
    runtime.registerPersistedEntity(PersistedNode, () => new PersistedNode());

    const result = runtime.loadSnapshot({
      version: 1,
      rootSid: "e1",
      entities: [
        { sid: "e1", type: "persisted-with-target", parentSid: null },
        { sid: "e2", type: "persisted-node", parentSid: null },
      ],
      atoms: {
        "e1:targeter:target": { $ref: { kind: "entity", sid: "e2" } },
      },
    });

    expect(result).toEqual({ ok: true, errors: [] });
    const owner = runtime.registry.getEntitiesByType(PersistedWithTarget)[0]!;
    const targetEntity = runtime.registry.getEntitiesByType(PersistedNode)[0]!;
    const targeter = owner.getComponent(Targeter);
    expect(targeter.target.get()).toBe(targetEntity);
  });

  test("loadSnapshot fails fast when store restore fails", () => {
    const runtime = new EcsRuntime(new EntityRegistry());
    const result = runtime.loadSnapshot({
      version: 2 as unknown as 1,
      rootSid: "e1",
      entities: [],
      atoms: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("unsupported_version");
    }
  });
});
