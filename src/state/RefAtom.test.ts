import { describe, expect, test } from "bun:test";
import { RefAtom } from "./RefAtom.ts";

describe("RefAtom", () => {
  test("returns default reference", () => {
    const target = { id: "t-1" };
    const ref = new RefAtom("target", target);
    expect(ref.get()).toBe(target);
  });

  test("set updates reference and supports null", () => {
    const ref = new RefAtom<{ id: string } | null>("target", null);
    const target = { id: "t-2" };

    ref.set(target);
    expect(ref.get()).toBe(target);

    ref.set(null);
    expect(ref.get()).toBeNull();
  });

  test("bind and unbind update internal bound state", () => {
    const ref = new RefAtom<{ id: string } | null>("target", null);
    expect(ref._isBound).toBe(false);
    ref._bind();
    expect(ref._isBound).toBe(true);
    ref._unbind();
    expect(ref._isBound).toBe(false);
  });
});
