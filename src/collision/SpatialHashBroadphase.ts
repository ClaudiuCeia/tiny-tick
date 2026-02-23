import type { CollisionEntity } from "./CollisionEntity.ts";

type AABB = { x: number; y: number; width: number; height: number };

export type CollisionPair = [CollisionEntity, CollisionEntity];

const intersects = (a: AABB, b: AABB): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export class SpatialHashBroadphase {
  constructor(private readonly cellSize = 64) {
    if (cellSize <= 0) {
      throw new Error("SpatialHashBroadphase cellSize must be > 0");
    }
  }

  public queryPairs(colliders: CollisionEntity[]): CollisionPair[] {
    const buckets = new Map<string, CollisionEntity[]>();

    for (const collider of colliders) {
      const bbox = collider.bbox();
      const minX = Math.floor(bbox.x / this.cellSize);
      const maxX = Math.floor((bbox.x + bbox.width) / this.cellSize);
      const minY = Math.floor(bbox.y / this.cellSize);
      const maxY = Math.floor((bbox.y + bbox.height) / this.cellSize);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const key = `${x}:${y}`;
          const list = buckets.get(key);
          if (list) {
            list.push(collider);
          } else {
            buckets.set(key, [collider]);
          }
        }
      }
    }

    const pairs: CollisionPair[] = [];
    const seen = new Set<string>();

    for (const list of buckets.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!;
          const b = list[j]!;
          if (!a.canCollideWith(b)) continue;

          const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
          if (seen.has(key)) continue;

          if (!intersects(a.bbox(), b.bbox())) continue;

          seen.add(key);
          pairs.push([a, b]);
        }
      }
    }

    return pairs;
  }
}
