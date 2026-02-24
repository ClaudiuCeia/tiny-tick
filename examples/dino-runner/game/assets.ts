import { defineAssetManifest, type EcsRuntime, type LoadedAssetManifest } from "./lib.ts";

const base = "/examples/dino-runner/assets/kenney_new-platformer-pack-1.1";

export const runnerAssetManifest = defineAssetManifest({
  images: {
    runnerIdle: `${base}/Vector/Characters/character_purple_idle.svg`,
    runnerJump: `${base}/Vector/Characters/character_purple_jump.svg`,
    runnerWalkA: `${base}/Vector/Characters/character_purple_walk_a.svg`,
    runnerWalkB: `${base}/Vector/Characters/character_purple_walk_b.svg`,
    runnerHit: `${base}/Vector/Characters/character_purple_hit.svg`,
    blockGreen: `${base}/Vector/Tiles/block_green.svg`,
    blockYellow: `${base}/Vector/Tiles/block_yellow.svg`,
    blockRed: `${base}/Vector/Tiles/block_red.svg`,
    terrainTop: `${base}/Vector/Tiles/terrain_grass_block_top.svg`,
    terrainMiddle: `${base}/Vector/Tiles/terrain_dirt_block_center.svg`,
    terrainBottom: `${base}/Vector/Tiles/terrain_dirt_block_bottom.svg`,
    backgroundColor: `${base}/Vector/Backgrounds/background_color_desert.svg`,
    backgroundClouds: `${base}/Vector/Backgrounds/background_clouds.svg`,
  },
  audio: {
    jump: `${base}/Sounds/sfx_jump.ogg`,
    land: `${base}/Sounds/sfx_bump.ogg`,
    score: `${base}/Sounds/sfx_coin.ogg`,
    hurt: `${base}/Sounds/sfx_hurt.ogg`,
  },
  fonts: {
    ui: {
      family: "Kenney Pixel",
      source: "url('/examples/dino-runner/assets/kenney_kenney-fonts/Fonts/Kenney%20Pixel.ttf')",
    },
  },
});

export type RunnerAssetBundle = LoadedAssetManifest<typeof runnerAssetManifest>;

export const loadRunnerAssets = async (runtime: EcsRuntime): Promise<RunnerAssetBundle> => {
  return runtime.assets.load(runnerAssetManifest, { scopeLabel: "dino-runner-scene" });
};
