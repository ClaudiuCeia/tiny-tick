import { describe, test, expect } from "bun:test";
import { tent, easeInOut, easeIn, easeOut, bounce, lerp, exponentialInOut } from "./math.ts";

describe("math utilities", () => {
  describe("lerp", () => {
    test("lerp(a,b,0) = a", () => expect(lerp(0, 10, 0)).toBe(0));
    test("lerp(a,b,1) = b", () => expect(lerp(0, 10, 1)).toBe(10));
    test("lerp(a,b,0.5) = midpoint", () => expect(lerp(0, 10, 0.5)).toBe(5));
    test("lerp works with negative values", () => expect(lerp(-10, 10, 0.5)).toBe(0));
  });

  describe("tent", () => {
    test("tent(0) = 0", () => expect(tent(0)).toBe(0));
    test("tent(0.5) = 1", () => expect(tent(0.5)).toBe(1));
    test("tent(1) = 0", () => expect(tent(1)).toBe(0));
    test("tent(0.25) = 0.5", () => expect(tent(0.25)).toBeCloseTo(0.5));
    test("tent returns 0 outside [0,1]", () => {
      expect(tent(-0.1)).toBe(0);
      expect(tent(1.1)).toBe(0);
    });
  });

  describe("easeInOut", () => {
    test("easeInOut(0) = 0", () => expect(easeInOut(0)).toBe(0));
    test("easeInOut(1) = 0", () => expect(easeInOut(1)).toBe(0));
    test("easeInOut returns 0 outside [0,1]", () => {
      expect(easeInOut(-0.5)).toBe(0);
      expect(easeInOut(1.5)).toBe(0);
    });
    test("easeInOut(0.25) >= 0", () => expect(easeInOut(0.25)).toBeGreaterThanOrEqual(0));
  });

  describe("easeIn / easeOut", () => {
    test("easeIn(0) = 0", () => expect(easeIn(0)).toBe(0));
    test("easeOut(0) = 0", () => expect(easeOut(0)).toBe(0));
    test("easeIn returns 0 outside [0,1]", () => expect(easeIn(2)).toBe(0));
  });

  describe("bounce", () => {
    test("bounce(0) = 0", () => expect(bounce(0)).toBe(0));
    test("bounce(0.5) = 1", () => expect(bounce(0.5)).toBeCloseTo(1));
    test("bounce(1) = 0", () => expect(bounce(1)).toBeCloseTo(0));
  });

  describe("exponentialInOut", () => {
    test("returns 0 for x < 0", () => expect(exponentialInOut(-1)).toBe(0));
    test("returns 0 for x > 1", () => expect(exponentialInOut(2)).toBe(0));
    test("returns positive value for x in (0,1)", () => {
      expect(exponentialInOut(0.5)).toBeGreaterThan(0);
    });
  });
});
