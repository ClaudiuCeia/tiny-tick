import { describe, expect, test } from "bun:test";
import { fitRectContain } from "./sprite.ts";

describe("fitRectContain", () => {
  test("letterboxes wide source into tall target", () => {
    const rect = fitRectContain(200, 100, { x: 10, y: 20, width: 100, height: 100 });
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(45);
  });

  test("pillarboxes tall source into wide target", () => {
    const rect = fitRectContain(100, 200, { x: 0, y: 0, width: 120, height: 60 });
    expect(rect.height).toBe(60);
    expect(rect.width).toBe(30);
    expect(rect.x).toBe(45);
    expect(rect.y).toBe(0);
  });
});
