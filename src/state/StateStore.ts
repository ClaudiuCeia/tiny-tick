import type { RestoreOptions, RestoreResult, Snapshot, SnapshotOptions } from "./types.ts";

export class StateStore {
  private atoms = new Map<string, unknown>();
  private persistentKeys = new Set<string>();
  private rootSid = "";
  private entities: Snapshot["entities"] = [];
  private meta: Snapshot["meta"] = undefined;

  public registerAtom(
    key: string,
    defaultValue: unknown,
    options: { persist?: boolean } = {},
  ): void {
    if (!this.atoms.has(key)) {
      this.atoms.set(key, defaultValue);
    }
    if (options.persist !== false) {
      this.persistentKeys.add(key);
    }
  }

  public setAtomValue(key: string, value: unknown): void {
    this.atoms.set(key, value);
  }

  public getAtomValue<T>(key: string): T | undefined {
    return this.atoms.get(key) as T | undefined;
  }

  public snapshot(options: SnapshotOptions = {}): Snapshot {
    const atoms: Record<string, unknown> = {};
    for (const key of this.persistentKeys) {
      if (this.atoms.has(key)) {
        atoms[key] = this.atoms.get(key);
      }
    }

    const rootSid = options.rootSid ?? this.rootSid;
    const entities = options.entities ?? this.entities;
    const sceneId = options.sceneId ?? this.meta?.sceneId;
    const createdAt = options.createdAt ?? this.meta?.createdAt;

    return {
      version: 1,
      meta: { sceneId, createdAt },
      rootSid,
      entities: [...entities],
      atoms,
    };
  }

  public restore(snapshot: Snapshot, _options: RestoreOptions = {}): RestoreResult {
    if (snapshot.version !== 1) {
      return {
        ok: false,
        errors: [
          {
            code: "unsupported_version",
            message: `Unsupported snapshot version: ${snapshot.version}`,
            path: "version",
          },
        ],
      };
    }

    if (
      typeof snapshot.atoms !== "object" ||
      snapshot.atoms === null ||
      Array.isArray(snapshot.atoms)
    ) {
      return {
        ok: false,
        errors: [
          {
            code: "invalid_payload",
            message: "Snapshot atoms payload must be an object.",
            path: "atoms",
          },
        ],
      };
    }

    this.clear();
    this.rootSid = snapshot.rootSid;
    this.entities = [...snapshot.entities];
    this.meta = snapshot.meta ? { ...snapshot.meta } : undefined;

    for (const [key, value] of Object.entries(snapshot.atoms)) {
      this.atoms.set(key, value);
      this.persistentKeys.add(key);
    }

    return { ok: true, errors: [] };
  }

  public clear(): void {
    this.atoms.clear();
    this.persistentKeys.clear();
    this.rootSid = "";
    this.entities = [];
    this.meta = undefined;
  }
}
