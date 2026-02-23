import { Entity } from "../ecs/Entity.ts";
import { Component } from "../ecs/Component.ts";
import { RenderComponent } from "../render/RenderComponent.ts";
import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { Vector2D } from "../math/Vector2D.ts";
import type { ICamera } from "../render/ICamera.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";

type ProfileKind = "awake" | "update" | "render" | "destroy";
type ProfileData = { count: number; totalTime: number };
type ProfileRecord = {
  name: string;
  kind: "entity" | "component" | "renderComponent";
  samples: Record<ProfileKind, ProfileData>;
  entityRef?: Entity;
};

/**
 * Runtime performance profiler for the ECS.
 *
 * Patches Entity, Component, and RenderComponent prototypes to time every
 * awake/update/render/destroy call. Reports per-class averages.
 *
 * Usage:
 *   EntityProfiler.start()   // begin recording
 *   EntityProfiler.stop()    // stop recording
 *   EntityProfiler.printTopSlow('update', 10)  // print slowest
 *   EntityProfiler.scanOffscreenCollision(camera)  // audit culling
 */
export class EntityProfiler {
  private static isRunning = false;
  private static isHooked = false;
  private static records: Map<unknown, ProfileRecord> = new Map();

  public static start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.hook();
    console.log("%c[Profiler] Started.", "color: lime");
  }

  public static stop(): void {
    this.isRunning = false;
    console.log("%c[Profiler] Stopped.", "color: orangered");
  }

  public static clear(): void {
    this.records.clear();
  }

  public static printTopSlow(kind: ProfileKind, topN = 10): void {
    const list = Array.from(this.records.values())
      .filter((r) => r.samples[kind] && r.samples[kind].count > 0)
      .map((r) => ({
        name: r.name,
        kind: r.kind,
        avg: r.samples[kind].totalTime / r.samples[kind].count,
        ref: r.entityRef,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, topN);

    console.group(`%c[Profiler] Top ${topN} slowest by ${kind}`, "color: gold");
    for (const r of list) {
      console.log(
        `%c${r.kind.toUpperCase()}: ${r.name} | ${r.avg.toFixed(3)} ms avg`,
        "color: cyan",
      );
      if (r.ref) this.printTopChildren(r.ref, kind);
    }
    console.groupEnd();
  }

  private static printTopChildren(entity: Entity, kind: ProfileKind): void {
    const childRecords = entity.children
      .map((child) => ({
        name: child.constructor.name,
        record: this.records.get(child.constructor),
      }))
      .filter((c) => c.record?.samples[kind])
      .map((c) => ({
        name: c.name,
        avg: c.record!.samples[kind].totalTime / c.record!.samples[kind].count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    if (childRecords.length) {
      console.group("  %cChildren:", "color: violet");
      for (const child of childRecords) {
        console.log(`  ${child.name}: ${child.avg.toFixed(3)}ms avg`);
      }
      console.groupEnd();
    }
  }

  public static scanOffscreenCollision(camera: ICamera): void {
    console.group("%c[Profiler] Offscreen CollisionEntities:", "color: orange");
    const canvasSize = Vector2D.fromScreen();
    for (const entity of EcsRuntime.getCurrent().registry.getAllEntities()) {
      const colliders = entity.children.filter(
        (c) => c instanceof CollisionEntity,
      ) as CollisionEntity[];
      for (const col of colliders) {
        const bbox = col.bbox();
        const screenPos = camera.toCanvas(new Vector2D(bbox.x, bbox.y), canvasSize);
        if (
          screenPos.x + bbox.width < 0 ||
          screenPos.x > canvasSize.x ||
          screenPos.y + bbox.height < 0 ||
          screenPos.y > canvasSize.y
        ) {
          console.warn(`Offscreen collider in ${entity.constructor.name}`, bbox);
        }
      }
    }
    console.groupEnd();
  }

  private static hook(): void {
    if (this.isHooked) return;

    const patch = (proto: object, method: string, kind: ProfileKind, isEntity: boolean) => {
      const orig = (proto as Record<string, unknown>)[method] as (...args: unknown[]) => unknown;
      (proto as Record<string, unknown>)[method] = function (this: unknown, ...args: unknown[]) {
        const start = performance.now();
        const result = orig.apply(this, args);
        EntityProfiler.record(
          (this as { constructor: unknown }).constructor,
          isEntity ? "entity" : "component",
          kind,
          performance.now() - start,
          this instanceof Entity ? this : undefined,
        );
        return result;
      };
    };

    patch(Entity.prototype, "awake", "awake", true);
    patch(Entity.prototype, "update", "update", true);
    patch(Entity.prototype, "destroy", "destroy", true);

    patch(Component.prototype, "awake", "awake", false);
    patch(Component.prototype, "update", "update", false);
    patch(Component.prototype, "destroy", "destroy", false);

    patch(RenderComponent.prototype, "awake", "awake", false);
    patch(RenderComponent.prototype, "update", "update", false);
    patch(RenderComponent.prototype, "render", "render", false);
    patch(RenderComponent.prototype, "destroy", "destroy", false);
    this.isHooked = true;
  }

  private static record(
    ctor: unknown,
    kind: "entity" | "component" | "renderComponent",
    method: ProfileKind,
    deltaMs: number,
    instance?: Entity,
  ): void {
    let rec = this.records.get(ctor);
    if (!rec) {
      rec = {
        name: (ctor as { name: string }).name,
        kind,
        samples: {
          awake: { count: 0, totalTime: 0 },
          update: { count: 0, totalTime: 0 },
          render: { count: 0, totalTime: 0 },
          destroy: { count: 0, totalTime: 0 },
        },
        entityRef: instance,
      };
      this.records.set(ctor, rec);
    }
    const s = rec.samples[method];
    s.count++;
    s.totalTime += deltaMs;
  }
}
