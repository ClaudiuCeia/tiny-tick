import { describe, test, expect, beforeEach } from "bun:test";
import { Entity } from "../ecs/Entity.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { TransformComponent } from "./TransformComponent.ts";
import { Vector2D } from "../math/Vector2D.ts";

class Node extends Entity {}

beforeEach(() => {
  EcsRuntime.reset();
});

describe("TransformComponent", () => {
  test("globalTransform applies parent rotation and scale to local position", () => {
    const parent = new Node();
    const child = new Node();

    const parentTx = new TransformComponent({
      position: new Vector2D(10, 20),
      rotation: Math.PI / 2,
      scale: 2,
    });
    const childTx = new TransformComponent({
      position: new Vector2D(3, 0),
      rotation: 0.25,
      scale: 4,
    });

    parent.addComponent(parentTx);
    child.addComponent(childTx);
    parent.addChild(child);
    parent.awake();

    const global = childTx.globalTransform;
    expect(global.position.x).toBeCloseTo(10);
    expect(global.position.y).toBeCloseTo(26);
    expect(global.rotation).toBeCloseTo(Math.PI / 2 + 0.25);
    expect(global.scale).toBeCloseTo(8);
  });

  test("awake auto-wires parent transform from entity parent", () => {
    const parent = new Node();
    const child = new Node();

    const parentTx = new TransformComponent();
    const childTx = new TransformComponent();

    parent.addComponent(parentTx);
    child.addComponent(childTx);
    parent.addChild(child);

    parent.awake();

    expect(childTx.parent).toBe(parentTx);
  });

  test("setPosition overloads update coordinates", () => {
    const tx = new TransformComponent();

    tx.setPosition(3, 4);
    expect(tx.transform.position.x).toBe(3);
    expect(tx.transform.position.y).toBe(4);

    tx.setPosition(new Vector2D(7, 9));
    expect(tx.transform.position.x).toBe(7);
    expect(tx.transform.position.y).toBe(9);
  });

  test("setPosition(number) without y throws", () => {
    const tx = new TransformComponent();
    expect(() => tx.setPosition(2 as unknown as Vector2D)).toThrow();
  });

  test("chainable mutators return this and update transform", () => {
    const tx = new TransformComponent();

    const out = tx.translate(5, -2).rotate(0.5).scaleBy(3).setRotation(1.5).setScale(2);

    expect(out).toBe(tx);
    expect(tx.transform.position.x).toBe(5);
    expect(tx.transform.position.y).toBe(-2);
    expect(tx.transform.rotation).toBe(1.5);
    expect(tx.transform.scale).toBe(2);
  });

  test("anchorTo(entity) and unanchor work", () => {
    const parent = new Node();
    const child = new Node();
    const parentTx = new TransformComponent();
    const childTx = new TransformComponent();

    parent.addComponent(parentTx);
    child.addComponent(childTx);

    childTx.anchorTo(parent);
    expect(childTx.parent).toBe(parentTx);

    childTx.unanchor();
    expect(childTx.parent).toBeNull();
  });

  test("anchorTo(entity) throws if entity has no TransformComponent", () => {
    const parent = new Node();
    const childTx = new TransformComponent();

    expect(() => childTx.anchorTo(parent)).toThrow("Entity does not have a TransformComponent");
  });
});
