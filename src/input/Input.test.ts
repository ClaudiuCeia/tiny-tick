import { describe, test, expect } from "bun:test";
import { InputManager } from "./Input.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { EntityRegistry } from "../ecs/EntityRegistry.ts";

type HandlerMap = Record<string, Array<(event: any) => void>>;

const makeTarget = (handlers: HandlerMap): EventTarget =>
  ({
    addEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      handlers[type] ??= [];
      handlers[type].push(fn as (event: any) => void);
    },
    removeEventListener(type: string, fn: EventListenerOrEventListenerObject) {
      const list = handlers[type];
      if (!list) return;
      const i = list.indexOf(fn as (event: any) => void);
      if (i !== -1) list.splice(i, 1);
    },
  }) as unknown as EventTarget;

describe("InputManager", () => {
  test("tracks key down / pressed / released transitions", () => {
    const handlers: HandlerMap = {};
    const input = new InputManager();
    input.init(makeTarget(handlers));

    handlers.keydown?.forEach((fn) => fn({ key: "Space" }));
    expect(input.isDown("Space")).toBe(true);
    expect(input.isPressed("Space")).toBe(true);

    input.clearFrame();
    expect(input.isPressed("Space")).toBe(false);
    expect(input.isDown("Space")).toBe(true);

    handlers.keyup?.forEach((fn) => fn({ key: "Space" }));
    expect(input.isDown("Space")).toBe(false);
    expect(input.isReleased("Space")).toBe(true);
  });

  test("mouse move and click are tracked and click clears per frame", () => {
    const handlers: HandlerMap = {};
    const input = new InputManager();
    input.init(makeTarget(handlers));

    handlers.mousemove?.forEach((fn) => fn({ clientX: 111, clientY: 222 }));
    expect(input.getMousePos().x).toBe(111);
    expect(input.getMousePos().y).toBe(222);

    handlers.click?.forEach((fn) => fn({}));
    expect(input.isMouseClick()).toBe(true);

    input.clearFrame();
    expect(input.isMouseClick()).toBe(false);
  });

  test("dispose removes listeners and clears state", () => {
    const handlers: HandlerMap = {};
    const input = new InputManager();
    input.init(makeTarget(handlers));

    handlers.keydown?.forEach((fn) => fn({ key: "a" }));
    expect(input.isDown("a")).toBe(true);

    input.dispose();
    expect(input.isDown("a")).toBe(false);

    const keydownCount = handlers.keydown?.length ?? 0;
    expect(keydownCount).toBe(0);
  });

  test("is runtime-scoped via EcsRuntime", () => {
    const runtimeA = new EcsRuntime(new EntityRegistry());
    const runtimeB = new EcsRuntime(new EntityRegistry());

    expect(runtimeA.input).not.toBe(runtimeB.input);

    const handlersA: HandlerMap = {};
    const handlersB: HandlerMap = {};

    runtimeA.input.init(makeTarget(handlersA));
    runtimeB.input.init(makeTarget(handlersB));

    handlersA.keydown?.forEach((fn) => fn({ key: "x" }));
    expect(runtimeA.input.isDown("x")).toBe(true);
    expect(runtimeB.input.isDown("x")).toBe(false);
  });
});
