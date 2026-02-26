import { describe, expect, test } from "bun:test";
import { StateStore } from "./StateStore.ts";
import type { RefToken, Snapshot } from "./types.ts";

describe("StateStore", () => {
  test("snapshot returns v1 shape when store is empty", () => {
    const store = new StateStore();

    const snapshot = store.snapshot({ sceneId: "gameplay", rootSid: "root-1" });

    expect(snapshot.version).toBe(1);
    expect(snapshot.meta?.sceneId).toBe("gameplay");
    expect(snapshot.rootSid).toBe("root-1");
    expect(snapshot.entities).toEqual([]);
    expect(snapshot.atoms).toEqual({});
  });

  test("snapshot persists registered scalar atoms", () => {
    const store = new StateStore();
    store.registerAtom("root-1:Health:hp", 100);
    store.setAtomValue("root-1:Health:hp", 90);

    const snapshot = store.snapshot();
    expect(snapshot.atoms).toEqual({ "root-1:Health:hp": 90 });
  });

  test("snapshot excludes non-persistent atoms", () => {
    const store = new StateStore();
    store.registerAtom("root-1:Health:hp", 100, { persist: false });
    store.setAtomValue("root-1:Health:hp", 90);

    const snapshot = store.snapshot();
    expect(snapshot.atoms).toEqual({});
  });

  test("snapshot persists ref tokens as atom values", () => {
    const store = new StateStore();
    const targetRef: RefToken = { $ref: { kind: "entity", sid: "enemy-7" } };
    store.registerAtom("root-1:Targeting:target", null);
    store.setAtomValue("root-1:Targeting:target", targetRef);

    const snapshot = store.snapshot();
    expect(snapshot.atoms).toEqual({ "root-1:Targeting:target": targetRef });
  });

  test("restore stores snapshot and subsequent snapshot returns restored values", () => {
    const store = new StateStore();
    const restored: Snapshot = {
      version: 1,
      rootSid: "root-1",
      entities: [{ sid: "root-1", type: "player", parentSid: null }],
      atoms: { "root-1:Health:hp": 90 },
    };

    const result = store.restore(restored);

    expect(result.ok).toBe(true);
    expect(store.snapshot()).toEqual({
      ...restored,
      meta: { sceneId: undefined, createdAt: undefined },
    });
  });

  test("restore fails for unsupported snapshot version", () => {
    const store = new StateStore();
    const result = store.restore({
      version: 2 as unknown as 1,
      rootSid: "root-1",
      entities: [],
      atoms: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("unsupported_version");
    }
  });

  test("restore fails for invalid atoms payload", () => {
    const store = new StateStore();
    const invalid: Snapshot = {
      version: 1,
      rootSid: "root-1",
      entities: [],
      atoms: [] as unknown as Record<string, unknown>,
    };

    const result = store.restore(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.code).toBe("invalid_payload");
    }
  });

  test("clear resets internal state", () => {
    const store = new StateStore();
    store.restore({
      version: 1,
      rootSid: "root-1",
      entities: [{ sid: "root-1", type: "player", parentSid: null }],
      atoms: { "root-1:Health:hp": 90 },
    });

    store.clear();

    expect(store.snapshot()).toEqual({
      version: 1,
      meta: { sceneId: undefined, createdAt: undefined },
      rootSid: "",
      entities: [],
      atoms: {},
    });
  });
});
