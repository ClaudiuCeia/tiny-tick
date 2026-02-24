/* eslint-disable @typescript-eslint/no-explicit-any */

type AssetKind = "image" | "audio" | "font" | "spritesheet";

type AssetHandle = {
  kind: AssetKind;
  cacheKey: string;
};

type LoaderResult<T> = {
  asset: T;
  dispose?: () => void;
};

type CacheEntry<T = unknown> = {
  kind: AssetKind;
  cacheKey: string;
  refs: number;
  promise: Promise<T> | null;
  value: T | null;
  dispose: (() => void) | null;
  dependencies: string[];
};

export type SpriteSheetTag = {
  from: number;
  to: number;
  loop?: boolean;
};

export type SpriteSheetFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  durationMs?: number;
};

export type SpriteSheetGridOptions = {
  frameWidth: number;
  frameHeight: number;
  count?: number;
  columns?: number;
  rows?: number;
  margin?: number;
  spacing?: number;
  names?: string[];
  durationMs?: number | number[];
  tags?: Record<string, SpriteSheetTag>;
};

export type SpriteSheetAsset = {
  image: HTMLImageElement;
  frames: SpriteSheetFrame[];
  tags: Record<string, SpriteSheetTag>;
};

type AssetLoaders = {
  image: (url: string) => Promise<LoaderResult<HTMLImageElement>>;
  audio: (url: string) => Promise<LoaderResult<HTMLAudioElement>>;
  font: (
    family: string,
    source: string,
    descriptors?: FontFaceDescriptors,
  ) => Promise<LoaderResult<FontFace>>;
  spritesheet: (
    image: HTMLImageElement,
    options: SpriteSheetGridOptions,
  ) => Promise<LoaderResult<SpriteSheetAsset>>;
};

export type AssetManagerOptions = {
  loaders?: Partial<AssetLoaders>;
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${parts.join(",")}}`;
};

const defaultImageLoader: AssetLoaders["image"] = async (url) => {
  const image = new Image();
  image.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });

  return { asset: image };
};

const defaultAudioLoader: AssetLoaders["audio"] = async (url) => {
  const audio = new Audio();
  audio.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load audio: ${url}`));
    };
    const cleanup = () => {
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("error", onError);
    };

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    audio.src = url;
    audio.load();
  });

  return { asset: audio };
};

const defaultFontLoader: AssetLoaders["font"] = async (family, source, descriptors) => {
  const face = new FontFace(family, source, descriptors);
  const loaded = await face.load();
  const fontSet = (document as unknown as { fonts?: { add?: (f: FontFace) => void } }).fonts;
  fontSet?.add?.(loaded);

  return {
    asset: loaded,
    dispose: () => {
      const fonts = (document as unknown as { fonts?: { delete?: (f: FontFace) => void } }).fonts;
      fonts?.delete?.(loaded);
    },
  };
};

const resolveImageDimensions = (image: HTMLImageElement): { width: number; height: number } => {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  return { width, height };
};

const buildSpriteSheetFromGrid = (
  image: HTMLImageElement,
  options: SpriteSheetGridOptions,
): SpriteSheetAsset => {
  const margin = options.margin ?? 0;
  const spacing = options.spacing ?? 0;
  const { width: imageWidth, height: imageHeight } = resolveImageDimensions(image);

  if (options.frameWidth <= 0 || options.frameHeight <= 0) {
    throw new Error("Sprite sheet frameWidth/frameHeight must be > 0");
  }

  const maxColumns = Math.max(
    1,
    Math.floor((imageWidth - margin * 2 + spacing) / (options.frameWidth + spacing)),
  );
  const maxRows = Math.max(
    1,
    Math.floor((imageHeight - margin * 2 + spacing) / (options.frameHeight + spacing)),
  );

  const columns = Math.max(1, Math.min(options.columns ?? maxColumns, maxColumns));
  const rows = Math.max(1, Math.min(options.rows ?? maxRows, maxRows));
  const maxCount = columns * rows;
  const count = Math.max(1, Math.min(options.count ?? maxCount, maxCount));

  const frames: SpriteSheetFrame[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);

    const duration = Array.isArray(options.durationMs) ? options.durationMs[i] : options.durationMs;

    frames.push({
      x: margin + col * (options.frameWidth + spacing),
      y: margin + row * (options.frameHeight + spacing),
      width: options.frameWidth,
      height: options.frameHeight,
      name: options.names?.[i],
      durationMs: duration,
    });
  }

  return {
    image,
    frames,
    tags: options.tags ?? {},
  };
};

const defaultSpriteSheetLoader: AssetLoaders["spritesheet"] = async (image, options) => {
  return { asset: buildSpriteSheetFromGrid(image, options) };
};

const DEFAULT_LOADERS: AssetLoaders = {
  image: defaultImageLoader,
  audio: defaultAudioLoader,
  font: defaultFontLoader,
  spritesheet: defaultSpriteSheetLoader,
};

export class AssetScope {
  private readonly aliases = new Map<string, AssetHandle>();

  constructor(
    private readonly manager: AssetManager,
    public readonly id: string,
    public readonly label: string,
  ) {}

  public async loadImage(alias: string, url: string): Promise<HTMLImageElement> {
    const handle = await this.manager.acquireImage(this.id, alias, url);
    this.aliases.set(alias, handle);
    return this.manager.getByHandle(handle) as HTMLImageElement;
  }

  public async loadAudio(alias: string, url: string): Promise<HTMLAudioElement> {
    const handle = await this.manager.acquireAudio(this.id, alias, url);
    this.aliases.set(alias, handle);
    return this.manager.getByHandle(handle) as HTMLAudioElement;
  }

  public async loadFont(
    alias: string,
    family: string,
    source: string,
    descriptors?: FontFaceDescriptors,
  ): Promise<FontFace> {
    const handle = await this.manager.acquireFont(this.id, alias, family, source, descriptors);
    this.aliases.set(alias, handle);
    return this.manager.getByHandle(handle) as FontFace;
  }

  public async loadSpriteSheetGrid(
    alias: string,
    imageAlias: string,
    options: SpriteSheetGridOptions,
  ): Promise<SpriteSheetAsset> {
    const imageHandle = this.aliases.get(imageAlias);
    if (!imageHandle || imageHandle.kind !== "image") {
      throw new Error(
        `Sprite sheet image alias '${imageAlias}' not found in scope '${this.label}'`,
      );
    }

    const handle = await this.manager.acquireSpriteSheet(this.id, alias, imageHandle, options);
    this.aliases.set(alias, handle);
    return this.manager.getByHandle(handle) as SpriteSheetAsset;
  }

  public has(alias: string): boolean {
    return this.aliases.has(alias);
  }

  public getImage(alias: string): HTMLImageElement {
    return this.get(alias, "image") as HTMLImageElement;
  }

  public getAudio(alias: string): HTMLAudioElement {
    return this.get(alias, "audio") as HTMLAudioElement;
  }

  public getFont(alias: string): FontFace {
    return this.get(alias, "font") as FontFace;
  }

  public getSpriteSheet(alias: string): SpriteSheetAsset {
    return this.get(alias, "spritesheet") as SpriteSheetAsset;
  }

  public releaseAlias(alias: string): void {
    this.manager.releaseAlias(this.id, alias);
    this.aliases.delete(alias);
  }

  public release(): void {
    this.manager.releaseScope(this.id);
    this.aliases.clear();
  }

  private get(alias: string, expectedKind: AssetKind): unknown {
    const handle = this.aliases.get(alias);
    if (!handle) {
      throw new Error(`Asset alias '${alias}' is not loaded in scope '${this.label}'`);
    }
    if (handle.kind !== expectedKind) {
      throw new Error(`Asset alias '${alias}' is '${handle.kind}', expected '${expectedKind}'`);
    }
    return this.manager.getByHandle(handle);
  }
}

export class AssetManager {
  private readonly loaders: AssetLoaders;
  private readonly entries = new Map<string, CacheEntry>();
  private readonly scopeAliases = new Map<string, Map<string, AssetHandle>>();
  private scopeCounter = 0;

  constructor(options: AssetManagerOptions = {}) {
    this.loaders = {
      image: options.loaders?.image ?? DEFAULT_LOADERS.image,
      audio: options.loaders?.audio ?? DEFAULT_LOADERS.audio,
      font: options.loaders?.font ?? DEFAULT_LOADERS.font,
      spritesheet: options.loaders?.spritesheet ?? DEFAULT_LOADERS.spritesheet,
    };
  }

  public createScope(label = "scope"): AssetScope {
    const id = `${label}:${++this.scopeCounter}`;
    this.scopeAliases.set(id, new Map());
    return new AssetScope(this, id, label);
  }

  public releaseScope(scopeId: string): void {
    const aliases = this.scopeAliases.get(scopeId);
    if (!aliases) return;

    for (const alias of Array.from(aliases.keys())) {
      this.releaseAlias(scopeId, alias);
    }

    this.scopeAliases.delete(scopeId);
  }

  public clear(): void {
    for (const scopeId of Array.from(this.scopeAliases.keys())) {
      this.releaseScope(scopeId);
    }
    this.entries.clear();
  }

  public getStats(): {
    scopes: number;
    cachedAssets: number;
    refs: number;
  } {
    let refs = 0;
    for (const entry of this.entries.values()) refs += entry.refs;

    return {
      scopes: this.scopeAliases.size,
      cachedAssets: this.entries.size,
      refs,
    };
  }

  public getByHandle(handle: AssetHandle): unknown {
    const entry = this.entries.get(handle.cacheKey);
    if (!entry || !entry.value) {
      throw new Error(`Asset '${handle.cacheKey}' is not loaded`);
    }
    return entry.value;
  }

  public async acquireImage(scopeId: string, alias: string, url: string): Promise<AssetHandle> {
    const cacheKey = `image:${url}`;
    await this.acquire(scopeId, alias, "image", cacheKey, async () => this.loaders.image(url), []);
    return { kind: "image", cacheKey };
  }

  public async acquireAudio(scopeId: string, alias: string, url: string): Promise<AssetHandle> {
    const cacheKey = `audio:${url}`;
    await this.acquire(scopeId, alias, "audio", cacheKey, async () => this.loaders.audio(url), []);
    return { kind: "audio", cacheKey };
  }

  public async acquireFont(
    scopeId: string,
    alias: string,
    family: string,
    source: string,
    descriptors?: FontFaceDescriptors,
  ): Promise<AssetHandle> {
    const cacheKey = `font:${family}:${source}:${stableStringify(descriptors ?? {})}`;
    await this.acquire(
      scopeId,
      alias,
      "font",
      cacheKey,
      async () => this.loaders.font(family, source, descriptors),
      [],
    );
    return { kind: "font", cacheKey };
  }

  public async acquireSpriteSheet(
    scopeId: string,
    alias: string,
    imageHandle: AssetHandle,
    options: SpriteSheetGridOptions,
  ): Promise<AssetHandle> {
    if (imageHandle.kind !== "image") {
      throw new Error("Sprite sheets can only be created from image assets");
    }

    const imageEntry = this.entries.get(imageHandle.cacheKey);
    if (!imageEntry || !imageEntry.value) {
      throw new Error(`Image asset '${imageHandle.cacheKey}' must be loaded before spritesheet`);
    }

    this.incrementRef(imageHandle.cacheKey);
    const cacheKey = `spritesheet:${imageHandle.cacheKey}:${stableStringify(options)}`;

    try {
      await this.acquire(
        scopeId,
        alias,
        "spritesheet",
        cacheKey,
        async () => this.loaders.spritesheet(imageEntry.value as HTMLImageElement, options),
        [imageHandle.cacheKey],
      );
    } catch (error) {
      this.decrementRef(imageHandle.cacheKey);
      throw error;
    }

    return { kind: "spritesheet", cacheKey };
  }

  public releaseAlias(scopeId: string, alias: string): void {
    const scopeAliases = this.scopeAliases.get(scopeId);
    if (!scopeAliases) return;

    const handle = scopeAliases.get(alias);
    if (!handle) return;

    scopeAliases.delete(alias);
    this.decrementRef(handle.cacheKey);
  }

  private getScopeAliases(scopeId: string): Map<string, AssetHandle> {
    const scopeAliases = this.scopeAliases.get(scopeId);
    if (!scopeAliases) {
      throw new Error(`Asset scope '${scopeId}' is not registered`);
    }
    return scopeAliases;
  }

  private async acquire(
    scopeId: string,
    alias: string,
    kind: AssetKind,
    cacheKey: string,
    loader: () => Promise<LoaderResult<any>>,
    dependencies: string[],
  ): Promise<void> {
    const scopeAliases = this.getScopeAliases(scopeId);
    if (scopeAliases.has(alias)) {
      throw new Error(`Asset alias '${alias}' already exists in this scope`);
    }

    let entry = this.entries.get(cacheKey);
    if (entry) {
      this.incrementRef(cacheKey);
      scopeAliases.set(alias, { kind, cacheKey });

      try {
        await entry.promise;
      } catch (error) {
        scopeAliases.delete(alias);
        this.decrementRef(cacheKey);
        throw error;
      }
      return;
    }

    entry = {
      kind,
      cacheKey,
      refs: 1,
      promise: null,
      value: null,
      dispose: null,
      dependencies,
    };
    this.entries.set(cacheKey, entry);
    scopeAliases.set(alias, { kind, cacheKey });

    const loadPromise = (async () => {
      const loaded = await loader();
      entry!.value = loaded.asset;
      entry!.dispose = loaded.dispose ?? null;
      return loaded.asset;
    })();

    entry.promise = loadPromise;

    try {
      await loadPromise;
    } catch (error) {
      scopeAliases.delete(alias);
      this.decrementRef(cacheKey);
      throw error;
    } finally {
      entry.promise = null;
      this.maybeCollect(cacheKey);
    }
  }

  private incrementRef(cacheKey: string): void {
    const entry = this.entries.get(cacheKey);
    if (!entry) return;
    entry.refs++;
  }

  private decrementRef(cacheKey: string): void {
    const entry = this.entries.get(cacheKey);
    if (!entry) return;

    entry.refs = Math.max(0, entry.refs - 1);
    this.maybeCollect(cacheKey);
  }

  private maybeCollect(cacheKey: string): void {
    const entry = this.entries.get(cacheKey);
    if (!entry) return;

    if (entry.refs > 0) return;
    if (entry.promise) return;

    if (entry.dispose) {
      entry.dispose();
    }

    this.entries.delete(cacheKey);
    for (const dependencyKey of entry.dependencies) {
      this.decrementRef(dependencyKey);
    }
  }
}
