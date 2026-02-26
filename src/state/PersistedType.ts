export type PersistableClass = Function & {
  readonly type?: unknown;
};

export function getPersistedType(klass: PersistableClass, kind: "entity" | "component"): string {
  const type = klass.type;
  if (typeof type !== "string") {
    const className = klass.name && klass.name.length > 0 ? klass.name : "<anonymous>";
    throw new Error(
      `Missing static type on ${kind} class ${className}. ` +
        `Persisted ${kind} classes must define 'static type: string'.`,
    );
  }

  const normalized = type.trim();
  if (normalized.length === 0) {
    const className = klass.name && klass.name.length > 0 ? klass.name : "<anonymous>";
    throw new Error(
      `Invalid static type on ${kind} class ${className}. ` +
        `Persisted ${kind} classes must define a non-empty 'static type'.`,
    );
  }

  return normalized;
}
