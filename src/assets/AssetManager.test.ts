import { describe, expect, test } from "bun:test";
import {
  AssetManager,
  defineAssetManifest,
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
  test("playAudio queues before unlock and drains on first gesture", async () => {
    const manager = new AssetManager();
    const listeners = new Map<string, EventListener[]>();
    const target = {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        const list = listeners.get(type) ?? [];
        const fn =
          typeof listener === "function"
            ? listener
            : (((event: Event) => listener.handleEvent(event)) as EventListener);
        list.push(fn);
        listeners.set(type, list);
      },
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        const list = listeners.get(type) ?? [];
        const fn =
          typeof listener === "function"
            ? listener
            : (((event: Event) => listener.handleEvent(event)) as EventListener);
        listeners.set(
          type,
          list.filter((entry) => entry !== fn),
        );
      },
    } as unknown as EventTarget;

    let plays = 0;
    const audio = {
      cloneNode: () =>
        ({
          volume: 1,
          currentTime: 0,
          play: async () => {
            plays++;
          },
        }) as HTMLAudioElement,
    } as unknown as HTMLAudioElement;

    manager.playAudio(audio, { volume: 0.4, unlockTarget: target });
    expect(plays).toBe(0);

    for (const listener of listeners.get("pointerdown") ?? []) {
      listener(new Event("pointerdown"));
    }
    await Promise.resolve();

    expect(plays).toBe(1);
  });

  test("playAudio with no unlock target plays immediately", async () => {
    const manager = new AssetManager();

    let plays = 0;
    const audio = {
      cloneNode: () =>
        ({
          volume: 1,
          currentTime: 0,
          play: async () => {
            plays++;
          },
        }) as HTMLAudioElement,
    } as unknown as HTMLAudioElement;

    manager.playAudio(audio, { volume: 0.5, unlockTarget: null });
    await Promise.resolve();
    expect(plays).toBe(1);
  });

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

  test("load(manifest) returns typed asset groups and can release scope", async () => {
    const manager = new AssetManager({
      loaders: {
        image: async (url) => ({ asset: mockImage(32, 32, url) }),
        audio: async (url) => ({ asset: { src: url } as HTMLAudioElement }),
        font: async (family) => ({ asset: { family } as FontFace }),
      },
    });

    const manifest = defineAssetManifest({
      images: {
        runner: "/runner.svg",
      },
      audio: {
        jump: "/jump.ogg",
      },
      fonts: {
        ui: {
          family: "Kenney Pixel",
          source: "url('/kenney.ttf')",
        },
      },
    });

    const loaded = await manager.load(manifest, { scopeLabel: "scene" });
    expect(loaded.images.runner.src).toBe("/runner.svg");
    expect(loaded.audio.jump.src).toBe("/jump.ogg");
    expect(loaded.fonts.ui.family).toBe("Kenney Pixel");
    expect(manager.getStats().refs).toBe(3);

    loaded.release();
    expect(manager.getStats()).toEqual({ scopes: 0, cachedAssets: 0, refs: 0 });
  });

  test("load(manifest) validates key and path formats", async () => {
    const manager = new AssetManager({
      loaders: {
        image: async (url) => ({ asset: mockImage(16, 16, url) }),
      },
    });

    await expect(
      manager.load({
        images: {
          "bad key": "/ok.svg",
        },
      }),
    ).rejects.toThrow("Invalid asset key");

    await expect(
      manager.load({
        images: {
          good: "/not-image.txt",
        },
      }),
    ).rejects.toThrow("unsupported file extension");
  });

  test("load(manifest) validates spritesheet image references", async () => {
    const manager = new AssetManager({
      loaders: {
        image: async (url) => ({ asset: mockImage(64, 64, url) }),
      },
    });

    await expect(
      manager.load({
        spritesheets: {
          hero: {
            image: "missing",
            options: {
              frameWidth: 16,
              frameHeight: 16,
              count: 4,
            },
          },
        },
      }),
    ).rejects.toThrow("references missing image key");
  });
});
