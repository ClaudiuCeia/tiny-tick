import { describe, expect, test } from "bun:test";
import { getPersistedType } from "./PersistedType.ts";

describe("getPersistedType", () => {
  test("returns static type for entity class", () => {
    class PlayerEntity {
      public static type = "player";
    }

    expect(getPersistedType(PlayerEntity, "entity")).toBe("player");
  });

  test("throws when static type is missing", () => {
    class EnemyEntity {}

    expect(() => getPersistedType(EnemyEntity, "entity")).toThrow(
      "Missing static type on entity class EnemyEntity",
    );
  });

  test("throws when static type is empty", () => {
    class HealthComponent {
      public static type = "   ";
    }

    expect(() => getPersistedType(HealthComponent, "component")).toThrow(
      "Invalid static type on component class HealthComponent",
    );
  });
});
