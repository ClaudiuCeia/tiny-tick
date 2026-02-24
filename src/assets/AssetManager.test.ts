import { describe, expect, test } from "bun:test";
import {
  AssetManager,
  type SpriteSheetAsset,
  type SpriteSheetGridOptions,
} from "./AssetManager.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { EntityRegistry } from "../ecs/EntityRegistry.ts";
import { InputManager } from "../input/Input.ts";

const mockImage = (width: number, height: number, src: string): HTMLImageElement =>
  ({
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    src,
  }) as unknown as HTMLImageElement;

describe("AssetManager", () => {
  test("deduplicates same image URL across scopes and cleans up on last release", async () => {
    let imageLoads = 0;
    const disposed: string[] = [];

    const manager = new AssetManager({
      loaders: {
        image: async (url) => {
          imageLoads++;
          return {
            asset: mockImage(64, 32, url),
            dispose: () => disposed.push(url),
          };
        },
      },
    });

    const a = manager.createScope("scene-a");
    const b = manager.createScope("scene-b");

    const imgA = await a.loadImage("hero", "/hero.png");
    const imgB = await b.loadImage("heroCopy", "/hero.png");

    expect(imageLoads).toBe(1);
    expect(imgA).toBe(imgB);
    expect(manager.getStats()).toEqual({ scopes: 2, cachedAssets: 1, refs: 2 });

    a.release();
    expect(manager.getStats()).toEqual({ scopes: 1, cachedAssets: 1, refs: 1 });

    b.release();
    expect(manager.getStats()).toEqual({ scopes: 0, cachedAssets: 0, refs: 0 });
    expect(disposed).toEqual(["/hero.png"]);
  });

  test("failed loads rollback alias/ref state and allow retry", async () => {
    let attempts = 0;
    const manager = new AssetManager({
      loaders: {
        image: async () => {
          attempts++;
          if (attempts === 1) {
            throw new Error("boom");
          }
          return { asset: mockImage(32, 32, "/ok.png") };
        },
      },
    });

    const scope = manager.createScope("scene");

    await expect(scope.loadImage("bad", "/bad.png")).rejects.toThrow("boom");
    expect(scope.has("bad")).toBe(false);
    expect(manager.getStats()).toEqual({ scopes: 1, cachedAssets: 0, refs: 0 });

    await scope.loadImage("good", "/good.png");
    expect(scope.has("good")).toBe(true);
    expect(manager.getStats()).toEqual({ scopes: 1, cachedAssets: 1, refs: 1 });
  });

  test("spritesheet grid uses image dependency and keeps image alive until sheet release", async () => {
    const manager = new AssetManager({
      loaders: {
        image: async (url) => ({ asset: mockImage(64, 32, url) }),
        spritesheet: async (image, options) => {
          const frames = options.count ?? 1;
          return {
            asset: {
              image,
              frames: Array.from({ length: frames }, (_, i) => ({
                x: i * options.frameWidth,
                y: 0,
                width: options.frameWidth,
                height: options.frameHeight,
              })),
              tags: options.tags ?? {},
            } as SpriteSheetAsset,
          };
        },
      },
    });

    const scope = manager.createScope("scene");
    await scope.loadImage("atlas", "/atlas.png");

    const sheetOpts: SpriteSheetGridOptions = {
      frameWidth: 16,
      frameHeight: 16,
      count: 4,
      columns: 4,
    };

    const sheet = await scope.loadSpriteSheetGrid("runner", "atlas", sheetOpts);
    expect(sheet.frames).toHaveLength(4);

    scope.releaseAlias("atlas");
    expect(manager.getStats()).toEqual({ scopes: 1, cachedAssets: 2, refs: 2 });

    scope.releaseAlias("runner");
    expect(manager.getStats()).toEqual({ scopes: 1, cachedAssets: 0, refs: 0 });
  });

  test("EcsRuntime owns an independent AssetManager instance", async () => {
    let loads = 0;
    const managerA = new AssetManager({
      loaders: {
        image: async (url) => {
          loads++;
          return { asset: mockImage(16, 16, url) };
        },
      },
    });
    const managerB = new AssetManager({
      loaders: {
        image: async (url) => {
          loads++;
          return { asset: mockImage(16, 16, url) };
        },
      },
    });

    const runtimeA = new EcsRuntime(new EntityRegistry(), new InputManager(), managerA);
    const runtimeB = new EcsRuntime(new EntityRegistry(), new InputManager(), managerB);

    const scopeA = runtimeA.assets.createScope("a");
    const scopeB = runtimeB.assets.createScope("b");

    await scopeA.loadImage("hero", "/hero.png");
    await scopeB.loadImage("hero", "/hero.png");

    expect(loads).toBe(2);
    expect(runtimeA.assets).not.toBe(runtimeB.assets);
  });
});
