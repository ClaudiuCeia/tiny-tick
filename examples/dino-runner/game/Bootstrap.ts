import {
  EcsRuntime,
  PhysicsSystem,
  SceneManager,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  World,
  type AssetScope,
  type ICanvas,
} from "./lib.ts";
import { RunnerScene } from "./scenes/RunnerScene.ts";

const DISPLAY_WIDTH = 1024;
const DISPLAY_HEIGHT = 576;

const createCanvas = (pixelScale: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(DISPLAY_WIDTH / pixelScale));
  canvas.height = Math.max(1, Math.floor(DISPLAY_HEIGHT / pixelScale));
  canvas.style.width = `${DISPLAY_WIDTH}px`;
  canvas.style.height = `${DISPLAY_HEIGHT}px`;
  canvas.style.border = "1px solid #2c2c2c";
  canvas.style.background = "#181818";
  if (pixelScale > 1) {
    canvas.style.imageRendering = "pixelated";
  }
  return canvas;
};

type DinoBootstrapOptions = {
  pixelScale?: number;
};

type RunnerVisualAssets = {
  scope: AssetScope;
  fontFamily: string;
  backgrounds: {
    color: HTMLImageElement;
    clouds: HTMLImageElement;
  };
  sprites: {
    idle: HTMLImageElement;
    jump: HTMLImageElement;
    walkA: HTMLImageElement;
    walkB: HTMLImageElement;
    hit: HTMLImageElement;
  };
  obstacleBlocks: [HTMLImageElement, HTMLImageElement, HTMLImageElement];
  terrainTiles: {
    top: HTMLImageElement;
    middle: HTMLImageElement;
    bottom: HTMLImageElement;
  };
  sounds: {
    jump: HTMLAudioElement;
    land: HTMLAudioElement;
    score: HTMLAudioElement;
    hurt: HTMLAudioElement;
  };
};

const loadRunnerAssets = async (runtime: EcsRuntime): Promise<RunnerVisualAssets> => {
  const scope = runtime.assets.createScope("dino-runner-scene");
  const base = "/examples/dino-runner/assets/kenney_new-platformer-pack-1.1";
  const chars = `${base}/Vector/Characters`;
  const tiles = `${base}/Vector/Tiles`;
  const bg = `${base}/Vector/Backgrounds`;
  const sounds = `${base}/Sounds`;

  let fontFamily = "monospace";
  try {
    await scope.loadFont(
      "ui-font",
      "Kenney Pixel",
      "url('/examples/dino-runner/assets/kenney_kenney-fonts/Fonts/Kenney%20Pixel.ttf')",
    );
    fontFamily = "Kenney Pixel";
  } catch {
    fontFamily = "monospace";
  }

  const [
    idle,
    jump,
    walkA,
    walkB,
    hit,
    block1,
    block2,
    block3,
    terrainTop,
    terrainMiddle,
    terrainBottom,
    bgColor,
    bgClouds,
  ] = await Promise.all([
    scope.loadImage("runner-idle", `${chars}/character_purple_idle.svg`),
    scope.loadImage("runner-jump", `${chars}/character_purple_jump.svg`),
    scope.loadImage("runner-walk-a", `${chars}/character_purple_walk_a.svg`),
    scope.loadImage("runner-walk-b", `${chars}/character_purple_walk_b.svg`),
    scope.loadImage("runner-hit", `${chars}/character_purple_hit.svg`),
    scope.loadImage("obstacle-block-1", `${tiles}/block_green.svg`),
    scope.loadImage("obstacle-block-2", `${tiles}/block_yellow.svg`),
    scope.loadImage("obstacle-block-3", `${tiles}/block_red.svg`),
    scope.loadImage("terrain-top", `${tiles}/terrain_grass_block_top.svg`),
    scope.loadImage("terrain-middle", `${tiles}/terrain_dirt_block_center.svg`),
    scope.loadImage("terrain-bottom", `${tiles}/terrain_dirt_block_bottom.svg`),
    scope.loadImage("bg-color", `${bg}/background_color_desert.svg`),
    scope.loadImage("bg-clouds", `${bg}/background_clouds.svg`),
  ]);

  const [jumpSfx, landSfx, scoreSfx, hurtSfx] = await Promise.all([
    scope.loadAudio("sfx-jump", `${sounds}/sfx_jump.ogg`),
    scope.loadAudio("sfx-land", `${sounds}/sfx_bump.ogg`),
    scope.loadAudio("sfx-score", `${sounds}/sfx_coin.ogg`),
    scope.loadAudio("sfx-hurt", `${sounds}/sfx_hurt.ogg`),
  ]);

  return {
    scope,
    fontFamily,
    backgrounds: {
      color: bgColor,
      clouds: bgClouds,
    },
    sprites: {
      idle,
      jump,
      walkA,
      walkB,
      hit,
    },
    obstacleBlocks: [block1, block2, block3],
    terrainTiles: {
      top: terrainTop,
      middle: terrainMiddle,
      bottom: terrainBottom,
    },
    sounds: {
      jump: jumpSfx,
      land: landSfx,
      score: scoreSfx,
      hurt: hurtSfx,
    },
  };
};

export const bootstrapDinoRunner = async (
  mount: HTMLElement = document.body,
  options: DinoBootstrapOptions = {},
): Promise<void> => {
  const pixelScale = Number.isFinite(options.pixelScale) ? Math.max(1, options.pixelScale ?? 1) : 1;
  const canvas = createCanvas(pixelScale);
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }
  if (pixelScale > 1) {
    ctx.imageSmoothingEnabled = false;
  }

  const runtime = new EcsRuntime();
  runtime.input.init(window);

  const sceneManager = new SceneManager();
  const canvasView: ICanvas = {
    context: ctx,
    size: new Vector2D(canvas.width, canvas.height),
  };

  const visuals = await loadRunnerAssets(runtime);

  const scene = new RunnerScene(runtime, canvasView, visuals);
  sceneManager.changeScene(scene);
  const world = new World({ runtime, fixedDeltaTime: 1 / 120, maxSubSteps: 8 });

  world.addSystem({
    phase: SystemPhase.Input,
    tickMode: SystemTickMode.Frame,
    update() {
      // Input listeners feed the runtime state. This phase makes ordering explicit.
    },
  });

  world.addSystem({
    phase: SystemPhase.Simulation,
    tickMode: SystemTickMode.Fixed,
    update(dt) {
      sceneManager.update(dt);
    },
  });

  world.addSystem(
    new PhysicsSystem({
      gravity: new Vector2D(0, 1400),
      velocityIterations: 8,
      positionIterations: 2,
      broadphaseCellSize: 64,
      sleepLinearThreshold: 2,
      sleepTimeThreshold: 0.2,
    }),
  );

  world.addSystem({
    phase: SystemPhase.Render,
    tickMode: SystemTickMode.Frame,
    update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sceneManager.render(ctx);
      runtime.input.clearFrame();
    },
  });

  let lastTs = performance.now();

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    world.step(dt);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};
