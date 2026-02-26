import type { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { EcsRuntime as Runtime } from "../ecs/EcsRuntime.ts";
import type { Component } from "../ecs/Component.ts";
import type { Entity } from "../ecs/Entity.ts";
import { PersistenceRegistry } from "./PersistenceRegistry.ts";
import type { RefToken, RestoreError, RestoreResult, Snapshot } from "./types.ts";

export type LoadOptions = {
  strict?: boolean;
};

export type LoadResult = RestoreResult;

export class PersistenceLoader {
  public constructor(private readonly registry: PersistenceRegistry) {}

  public loadIntoRuntime(
    snapshot: Snapshot,
    runtime: EcsRuntime,
    _options: LoadOptions = {},
  ): LoadResult {
    const errors = this.validateGraph(snapshot);
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const sidToEntity = new Map<string, Entity>();
    const sidToRuntimeId = new Map<string, string>();
    const createdEntities: Entity[] = [];

    try {
      Runtime.runWith(runtime, () => {
        for (const node of snapshot.entities) {
          const factory = this.registry.getEntityFactory(node.type);
          if (!factory) {
            throw new Error(`Missing persisted entity type: ${node.type}`);
          }
          const entity = factory(node) as Entity;
          sidToEntity.set(node.sid, entity);
          sidToRuntimeId.set(node.sid, entity.id);
          createdEntities.push(entity);
        }
      });

      for (const node of snapshot.entities) {
        if (!node.parentSid) continue;
        const parent = sidToEntity.get(node.parentSid);
        const child = sidToEntity.get(node.sid);
        if (!parent || !child) {
          this.cleanup(createdEntities);
          return {
            ok: false,
            errors: [
              {
                code: "missing_parent",
                message: `Parent '${node.parentSid}' not found for '${node.sid}'.`,
                path: `entities.${node.sid}.parentSid`,
              },
            ],
          };
        }
        parent.addChild(child);
      }

      runtime.store.clear();
      for (const [key, value] of Object.entries(snapshot.atoms)) {
        const mapped = this.mapSnapshotAtomKey(key, sidToRuntimeId);
        if (!mapped.ok) {
          this.cleanup(createdEntities);
          return { ok: false, errors: [mapped.error] };
        }

        let resolvedValue: unknown = value;
        if (this.isRefToken(value)) {
          const resolved = this.resolveToken(value, sidToEntity, key);
          if (!resolved.ok) {
            this.cleanup(createdEntities);
            return { ok: false, errors: [resolved.error] };
          }
          resolvedValue = resolved.value;
        }

        runtime.store.registerAtom(mapped.key, resolvedValue);
        runtime.store.setAtomValue(mapped.key, resolvedValue);
      }
    } catch (error) {
      this.cleanup(createdEntities);
      return {
        ok: false,
        errors: [
          {
            code: "invalid_payload",
            message: error instanceof Error ? error.message : "Failed to load snapshot.",
          },
        ],
      };
    }

    return { ok: true, errors: [] };
  }

  private mapSnapshotAtomKey(
    snapshotKey: string,
    sidToRuntimeId: Map<string, string>,
  ): { ok: true; key: string } | { ok: false; error: RestoreError } {
    const firstSep = snapshotKey.indexOf(":");
    const secondSep = snapshotKey.indexOf(":", firstSep + 1);

    if (firstSep <= 0 || secondSep <= firstSep + 1 || secondSep >= snapshotKey.length - 1) {
      return {
        ok: false,
        error: {
          code: "invalid_payload",
          message: `Invalid atom key format '${snapshotKey}'.`,
          path: snapshotKey,
        },
      };
    }

    const sid = snapshotKey.slice(0, firstSep);
    const componentType = snapshotKey.slice(firstSep + 1, secondSep);
    const atomName = snapshotKey.slice(secondSep + 1);
    const runtimeId = sidToRuntimeId.get(sid);
    if (!runtimeId) {
      return {
        ok: false,
        error: {
          code: "invalid_payload",
          message: `Unknown sid '${sid}' in atom key '${snapshotKey}'.`,
          path: snapshotKey,
        },
      };
    }

    return { ok: true, key: `${runtimeId}:${componentType}:${atomName}` };
  }

  private resolveToken(
    token: RefToken,
    sidToEntity: Map<string, Entity>,
    path: string,
  ): { ok: true; value: unknown } | { ok: false; error: RestoreError } {
    const ref = token.$ref;
    if (ref.kind === "entity") {
      const entity = sidToEntity.get(ref.sid);
      if (!entity) {
        return {
          ok: false,
          error: {
            code: "dangling_ref",
            message: `Dangling entity ref '${ref.sid}'.`,
            path,
          },
        };
      }
      return { ok: true, value: entity };
    }

    const entity = sidToEntity.get(ref.entitySid);
    if (!entity) {
      return {
        ok: false,
        error: {
          code: "dangling_ref",
          message: `Dangling component ref entity '${ref.entitySid}'.`,
          path,
        },
      };
    }

    const component = entity.components.find((c) => {
      const ctor = c.constructor as Function & { type?: unknown };
      return typeof ctor.type === "string" && ctor.type === ref.componentType;
    }) as Component | undefined;

    if (!component) {
      return {
        ok: false,
        error: {
          code: "dangling_ref",
          message: `Dangling component ref '${ref.componentType}' on entity '${ref.entitySid}'.`,
          path,
        },
      };
    }

    return { ok: true, value: component };
  }

  private validateGraph(snapshot: Snapshot): RestoreError[] {
    const errors: RestoreError[] = [];
    const sidSet = new Set<string>();
    const parentBySid = new Map<string, string | null>();

    for (const node of snapshot.entities) {
      if (sidSet.has(node.sid)) {
        errors.push({
          code: "duplicate_sid",
          message: `Duplicate sid '${node.sid}' in snapshot.`,
          path: `entities.${node.sid}`,
        });
      }
      sidSet.add(node.sid);
      parentBySid.set(node.sid, node.parentSid);

      if (!this.registry.getEntityFactory(node.type)) {
        errors.push({
          code: "unknown_type",
          message: `Unknown entity type '${node.type}'.`,
          path: `entities.${node.sid}.type`,
        });
      }
    }

    for (const node of snapshot.entities) {
      if (node.parentSid && !sidSet.has(node.parentSid)) {
        errors.push({
          code: "missing_parent",
          message: `Missing parent '${node.parentSid}' for '${node.sid}'.`,
          path: `entities.${node.sid}.parentSid`,
        });
      }
    }

    const state = new Map<string, 0 | 1 | 2>();
    const walk = (sid: string): boolean => {
      const s = state.get(sid) ?? 0;
      if (s === 1) return true;
      if (s === 2) return false;

      state.set(sid, 1);
      const parentSid = parentBySid.get(sid) ?? null;
      if (parentSid && walk(parentSid)) {
        return true;
      }
      state.set(sid, 2);
      return false;
    };

    for (const sid of sidSet) {
      if (walk(sid)) {
        errors.push({
          code: "parent_cycle",
          message: `Parent cycle detected at '${sid}'.`,
          path: `entities.${sid}.parentSid`,
        });
        break;
      }
    }

    return errors;
  }

  private isRefToken(value: unknown): value is RefToken {
    if (!value || typeof value !== "object") return false;
    const maybe = value as { $ref?: unknown };
    if (!maybe.$ref || typeof maybe.$ref !== "object") return false;
    const ref = maybe.$ref as { kind?: unknown };
    return ref.kind === "entity" || ref.kind === "component";
  }

  private cleanup(createdEntities: Entity[]): void {
    for (const entity of createdEntities) {
      if (!entity._markForGc) {
        entity.destroy();
      }
    }
  }
}
