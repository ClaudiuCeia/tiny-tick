import { describe, expect, test } from "bun:test";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { Entity } from "../ecs/Entity.ts";
import { Component } from "../ecs/Component.ts";
import { PersistenceLoader } from "./PersistenceLoader.ts";
import { PersistenceRegistry } from "./PersistenceRegistry.ts";
import type { Snapshot } from "./types.ts";

class RootEntity extends Entity {
  public static type = "root";
}

class ChildEntity extends Entity {
  public static type = "child";
}

class HealthComponent extends Component {
  public static type = "health";
  hp = this.atom("hp", 100);
}

class EntityWithHealth extends Entity {
  public static type = "with-health";

  public constructor() {
    super();
    this.addComponent(new HealthComponent());
  }
}

function createRuntimeAndRegistry(): {
  runtime: EcsRuntime;
  registry: PersistenceRegistry;
  loader: PersistenceLoader;
} {
  const runtime = new EcsRuntime();
  const registry = new PersistenceRegistry();
  const loader = new PersistenceLoader(registry);
  return { runtime, registry, loader };
}

describe("PersistenceLoader", () => {
  test("loads entity graph and links parents", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(RootEntity, () => new RootEntity());
    registry.registerEntity(ChildEntity, () => new ChildEntity());

    const snapshot: Snapshot = {
      version: 1,
      rootSid: "e1",
      entities: [
        { sid: "e1", type: "root", parentSid: null },
        { sid: "e2", type: "child", parentSid: "e1" },
      ],
      atoms: {},
    };

    const result = loader.loadIntoRuntime(snapshot, runtime);

    expect(result).toEqual({ ok: true, errors: [] });
    const roots = runtime.registry.getEntitiesByType(RootEntity);
    const children = runtime.registry.getEntitiesByType(ChildEntity);
    expect(roots).toHaveLength(1);
    expect(children).toHaveLength(1);
    expect(roots[0]?.children).toContain(children[0]!);
  });

  test("fails with unknown_type when entity type is missing from registry", () => {
    const { runtime, loader } = createRuntimeAndRegistry();
    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [{ sid: "e1", type: "missing", parentSid: null }],
        atoms: {},
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("unknown_type");
    }
  });

  test("fails with duplicate_sid for duplicate entity ids", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(RootEntity, () => new RootEntity());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [
          { sid: "e1", type: "root", parentSid: null },
          { sid: "e1", type: "root", parentSid: null },
        ],
        atoms: {},
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("duplicate_sid");
    }
  });

  test("fails with missing_parent when parent sid does not exist", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(ChildEntity, () => new ChildEntity());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e2",
        entities: [{ sid: "e2", type: "child", parentSid: "missing-parent" }],
        atoms: {},
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("missing_parent");
    }
  });

  test("fails with parent_cycle when parent chain has a cycle", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(RootEntity, () => new RootEntity());
    registry.registerEntity(ChildEntity, () => new ChildEntity());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [
          { sid: "e1", type: "root", parentSid: "e2" },
          { sid: "e2", type: "child", parentSid: "e1" },
        ],
        atoms: {},
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("parent_cycle");
    }
  });

  test("fails with dangling_ref when entity ref target is missing", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(RootEntity, () => new RootEntity());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [{ sid: "e1", type: "root", parentSid: null }],
        atoms: {
          "e1:Targeting:target": { $ref: { kind: "entity", sid: "e2" } },
        },
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("dangling_ref");
    }
  });

  test("fails with dangling_ref when component ref target is missing", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(RootEntity, () => new RootEntity());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [{ sid: "e1", type: "root", parentSid: null }],
        atoms: {
          "e1:Link:comp": {
            $ref: { kind: "component", entitySid: "e1", componentType: "health" },
          },
        },
      },
      runtime,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("dangling_ref");
    }
  });

  test("accepts valid component refs", () => {
    const { runtime, registry, loader } = createRuntimeAndRegistry();
    registry.registerEntity(EntityWithHealth, () => new EntityWithHealth());

    const result = loader.loadIntoRuntime(
      {
        version: 1,
        rootSid: "e1",
        entities: [{ sid: "e1", type: "with-health", parentSid: null }],
        atoms: {
          "e1:Link:comp": {
            $ref: { kind: "component", entitySid: "e1", componentType: "health" },
          },
        },
      },
      runtime,
    );

    expect(result).toEqual({ ok: true, errors: [] });
  });
});
