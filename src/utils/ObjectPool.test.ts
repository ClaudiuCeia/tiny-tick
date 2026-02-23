import { describe, test, expect } from "bun:test";
import { ObjectPool } from "./ObjectPool.ts";

describe("ObjectPool", () => {
  test("obtain creates items through factory", () => {
    let created = 0;
    const pool = new ObjectPool(() => ({ id: ++created }));

    const a = pool.obtain();
    const b = pool.obtain();

    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  test("released item is reused and reset is called", () => {
    const resets: number[] = [];
    const pool = new ObjectPool(
      () => ({ n: 10 }),
      (item) => {
        item.n = 0;
        resets.push(1);
      },
    );

    const a = pool.obtain();
    a.n = 99;
    pool.release(a);

    const b = pool.obtain();

    expect(b).toBe(a);
    expect(b.n).toBe(0);
    expect(resets).toHaveLength(1);
  });

  test("release of unknown item is ignored", () => {
    const pool = new ObjectPool(() => ({ id: 1 }));
    expect(() => pool.release({ id: 99 })).not.toThrow();
  });

  test("forEachInUse visits only currently checked-out items", () => {
    const pool = new ObjectPool(() => ({ id: crypto.randomUUID() }));

    const a = pool.obtain();
    const b = pool.obtain();
    pool.release(a);

    const seen: string[] = [];
    pool.forEachInUse((item) => seen.push(item.id));

    expect(seen).toEqual([b.id]);
  });
});
