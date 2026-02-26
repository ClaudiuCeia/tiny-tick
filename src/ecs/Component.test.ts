import { describe, expect, test } from "bun:test";
import { Component } from "./Component.ts";

class StatsComponent extends Component {
  hp = this.atom("hp", 100);
  mana = this.atom("mana", 30);
  target = this.ref<{ id: string } | null>("target", null);
}

describe("Component atom/ref declaration", () => {
  test("atom handles are usable before entity binding", () => {
    const component = new StatsComponent();

    expect(component.entity).toBeUndefined();
    expect(component.hp.get()).toBe(100);
    expect(component.mana.get()).toBe(30);

    component.hp.set(77);
    component.mana.set(12);

    expect(component.hp.get()).toBe(77);
    expect(component.mana.get()).toBe(12);
  });

  test("ref handle stores and returns object references", () => {
    const component = new StatsComponent();
    const target = { id: "enemy-1" };

    expect(component.target.get()).toBeNull();
    component.target.set(target);
    expect(component.target.get()).toBe(target);
  });

  test("bind and unbind propagate to declared handles", () => {
    const component = new StatsComponent();

    expect(component.hp._isBound).toBe(false);
    expect(component.target._isBound).toBe(false);

    component._bindStoreHandles();
    expect(component.hp._isBound).toBe(true);
    expect(component.target._isBound).toBe(true);

    component._unbindStoreHandles();
    expect(component.hp._isBound).toBe(false);
    expect(component.target._isBound).toBe(false);
  });
});
