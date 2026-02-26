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
  public constructor(
    private readonly registry: PersistenceRegistry,
  ) {}

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

      for (const [key, value] of Object.entries(snapshot.atoms)) {
        if (!this.isRefToken(value)) continue;
        const error = this.resolveToken(value, sidToEntity, key);
        if (error) {
          this.cleanup(createdEntities);
          return { ok: false, errors: [error] };
        }
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

  private resolveToken(
    token: RefToken,
    sidToEntity: Map<string, Entity>,
    path: string,
  ): RestoreError | null {
    const ref = token.$ref;
    if (ref.kind === "entity") {
      if (!sidToEntity.has(ref.sid)) {
        return {
          code: "dangling_ref",
          message: `Dangling entity ref '${ref.sid}'.`,
          path,
        };
      }
      return null;
    }

    const entity = sidToEntity.get(ref.entitySid);
    if (!entity) {
      return {
        code: "dangling_ref",
        message: `Dangling component ref entity '${ref.entitySid}'.`,
        path,
      };
    }

    const component = entity.components.find((c) => {
      const ctor = c.constructor as Function & { type?: unknown };
      return typeof ctor.type === "string" && ctor.type === ref.componentType;
    }) as Component | undefined;

    if (!component) {
      return {
        code: "dangling_ref",
        message: `Dangling component ref '${ref.componentType}' on entity '${ref.entitySid}'.`,
        path,
      };
    }

    return null;
  }

  private cleanup(createdEntities: Entity[]): void {
    for (const entity of createdEntities) {
      if (!entity._markForGc) {
        entity.destroy();
      }
    }
  }
}
