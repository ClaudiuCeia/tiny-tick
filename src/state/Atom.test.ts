import { describe, expect, test } from "bun:test";
import { Atom } from "./Atom.ts";

describe("Atom", () => {
  test("returns default value", () => {
    const atom = new Atom("hp", 100);
    expect(atom.get()).toBe(100);
  });

  test("set updates the value", () => {
    const atom = new Atom("hp", 100);
    atom.set(75);
    expect(atom.get()).toBe(75);
  });

  test("bind and unbind update internal bound state", () => {
    const atom = new Atom("hp", 100);
    expect(atom._isBound).toBe(false);
    atom._bind();
    expect(atom._isBound).toBe(true);
    atom._unbind();
    expect(atom._isBound).toBe(false);
  });
});
