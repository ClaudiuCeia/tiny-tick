import { beforeEach, describe, expect, test } from "bun:test";
import { Component } from "./Component.ts";
import { EcsRuntime } from "./EcsRuntime.ts";
import { Entity } from "./Entity.ts";

class Health extends Component {}
class Velocity extends Component {}
class Frozen extends Component {}

class Player extends Entity {}
class Enemy extends Entity {}

describe("EntityQuery", () => {
  beforeEach(() => {
    EcsRuntime.reset();
  });

  test("filters entities using with/without component constraints", () => {
    const registry = EcsRuntime.getCurrent().registry;

    const playerA = new Player();
    playerA.addComponent(new Health());
    playerA.addComponent(new Velocity());

    const playerB = new Player();
    playerB.addComponent(new Health());

    const enemy = new Enemy();
    enemy.addComponent(new Health());
    enemy.addComponent(new Velocity());
    enemy.addComponent(new Frozen());

    const query = registry.query().with(Health, Velocity).without(Frozen);
    const result = query.run();

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(playerA);
    expect(result).not.toContain(playerB);
    expect(result).not.toContain(enemy);
  });

  test("supports entity-type narrowing before component filters", () => {
    const registry = EcsRuntime.getCurrent().registry;

    const player = new Player();
    player.addComponent(new Health());

    const enemy = new Enemy();
    enemy.addComponent(new Health());

    const query = registry.query(Player).with(Health);
    const result = query.run();

    expect(result).toEqual([player]);
    expect(result).not.toContain(enemy);
  });

  test("reuses cached result while registry version is unchanged", () => {
    const registry = EcsRuntime.getCurrent().registry;

    const player = new Player();
    player.addComponent(new Health());

    const query = registry.query(Player).with(Health);
    const a = query.run();
    const b = query.run();

    expect(a).toBe(b);
    expect(query.hasChanged()).toBe(false);
  });

  test("component add/remove invalidates query cache", () => {
    const registry = EcsRuntime.getCurrent().registry;

    const player = new Player();
    const query = registry.query(Player).with(Health);

    expect(query.run()).toHaveLength(0);
    expect(query.hasChanged()).toBe(false);

    player.addComponent(new Health());
    expect(query.hasChanged()).toBe(true);
    expect(query.run()).toEqual([player]);

    player.removeComponent(Health);
    expect(query.hasChanged()).toBe(true);
    expect(query.run()).toHaveLength(0);
  });

  test("entity register/unregister and clear invalidate query cache", () => {
    const registry = EcsRuntime.getCurrent().registry;

    const query = registry.query(Player);
    expect(query.run()).toHaveLength(0);

    const player = new Player();
    expect(query.hasChanged()).toBe(true);
    expect(query.run()).toEqual([player]);

    player.destroy();
    expect(query.hasChanged()).toBe(true);
    expect(query.run()).toHaveLength(0);

    new Player();
    expect(query.run()).toHaveLength(1);
    registry.clear();
    expect(query.hasChanged()).toBe(true);
    expect(query.run()).toHaveLength(0);
  });
});
