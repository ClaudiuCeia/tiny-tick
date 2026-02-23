import { describe, test, expect, beforeEach } from "bun:test";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { CollisionEntity } from "./CollisionEntity.ts";
import { RectangleCollisionShape } from "./shapes/RectangleCollisionShape.ts";
import { CircleCollisionShape } from "./shapes/CircleCollisionShape.ts";
import { CurveCollisionShape } from "./shapes/CurveCollisionShape.ts";

beforeEach(() => {
  EcsRuntime.reset();
});

const tx = (x: number, y: number, rotation = 0, scale = 1) => ({
  position: new Vector2D(x, y),
  rotation,
  scale,
});

describe("collision shapes", () => {
  test("RectangleCollisionShape AABB with center anchor offsets by half size", () => {
    const rect = new RectangleCollisionShape(10, 20);
    expect(rect.getAABB(tx(5, 8), "center")).toEqual({
      x: 0,
      y: -2,
      width: 10,
      height: 20,
    });
  });

  test("RectangleCollisionShape collisions and MTV work", () => {
    const a = new RectangleCollisionShape(10, 10);
    const b = new RectangleCollisionShape(10, 10);

    const colliding = a.isCollidingWith(b, tx(0, 0), "top-left", tx(8, 0), "top-left");
    expect(colliding).toBe(true);

    const mtv = a.getCollisionNormal(b, tx(0, 0), "top-left", tx(8, 0), "top-left");
    expect(mtv).not.toBeNull();
    expect(mtv?.x).toBeLessThan(0);
    expect(mtv?.y).toBe(0);
  });

  test("RectangleCollisionShape containsPoint honors rotation", () => {
    const rect = new RectangleCollisionShape(10, 4);
    const inside = rect.containsPoint(new Vector2D(0, 2), tx(0, 0, Math.PI / 2), "top-left");
    const outside = rect.containsPoint(new Vector2D(10, 10), tx(0, 0, Math.PI / 2), "top-left");

    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });

  test("CurveCollisionShape collides with rectangles and rejects resize", () => {
    const curve = new CurveCollisionShape((x) => 10 + x * 0.1);
    const rect = new RectangleCollisionShape(10, 6);

    const hit = curve.isCollidingWith(rect, tx(0, 0), "top-left", tx(0, 6), "top-left");
    const miss = curve.isCollidingWith(rect, tx(0, 0), "top-left", tx(0, -30), "top-left");

    expect(hit).toBe(true);
    expect(miss).toBe(false);
    expect(() => curve.resize(1)).toThrow("does not support resizing");
  });

  test("CircleCollisionShape getCollisionNormal throws", () => {
    const circle = new CircleCollisionShape(5);
    const other = new CircleCollisionShape(3);

    expect(() => circle.getCollisionNormal(other, tx(0, 0), "center", tx(1, 1), "center")).toThrow(
      "does not support getCollisionNormal",
    );
  });

  test("CircleCollisionShape center-anchor contains its center point", () => {
    const circle = new CircleCollisionShape(10);
    const contains = circle.containsPoint(new Vector2D(100, 100), tx(100, 100), "center");
    expect(contains).toBe(true);
  });

  test("CircleCollisionShape circle-circle collision respects each scale", () => {
    const a = new CircleCollisionShape(5);
    const b = new CircleCollisionShape(5);

    const colliding = a.isCollidingWith(b, tx(0, 0, 0, 1), "center", tx(17, 0, 0, 3), "center");
    expect(colliding).toBe(true);
  });
});

describe("CollisionEntity", () => {
  test("awake adds transform and collision shape components", () => {
    const e = new CollisionEntity(new RectangleCollisionShape(10, 20));
    e.awake();

    expect(e.hasComponent(TransformComponent)).toBe(true);
    expect(e.bbox()).toEqual({ x: -5, y: -10, width: 10, height: 20 });
  });

  test("isColliding / containsPoint / resize work", () => {
    const a = new CollisionEntity(new RectangleCollisionShape(10, 10), "top-left");
    const b = new CollisionEntity(new RectangleCollisionShape(10, 10), "top-left");

    a.awake();
    b.awake();

    a.getComponent(TransformComponent).setPosition(0, 0);
    b.getComponent(TransformComponent).setPosition(9, 0);

    expect(a.isColliding(b)).toBe(true);
    expect(a.containsPoint(new Vector2D(3, 3))).toBe(true);

    a.resize(4, 4);
    expect(a.bbox().width).toBe(4);
  });

  test("anchor point can be changed at runtime", () => {
    const e = new CollisionEntity(new RectangleCollisionShape(10, 10), "center");
    e.awake();

    e.setAnchorPoint("top-left");
    expect(e.getAnchorPoint()).toBe("top-left");
  });
});
