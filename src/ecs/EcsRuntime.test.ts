import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Entity } from "./Entity.ts";
import { EntityRegistry } from "./EntityRegistry.ts";
import { EcsRuntime } from "./EcsRuntime.ts";

class Node extends Entity {}

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
});
