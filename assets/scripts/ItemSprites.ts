import { ImageAsset, JsonAsset, Rect, Size, SpriteFrame, Texture2D, resources } from 'cc';
import { DEFS, Kind, MAX_LEVEL } from './core/Inventory';

interface AtlasEntry { sheet: 'weapons' | 'items'; rect: [number, number, number, number] }
interface AtlasManifest { frames: Record<string, AtlasEntry> }

/** One shared texture per sheet; all inventory, drag and combat views reuse these frames. */

export class ItemSprites {
  private static frames = new Map<string, SpriteFrame>();
  private static loading: Promise<void> | null = null;
  static ready = false;
  static frame(kind: Kind, level: number): SpriteFrame | undefined {
    return this.frames.get(`${kind}-${kind === 'grip' ? 1 : Math.max(1, Math.min(MAX_LEVEL, Math.round(level)))}`);
  }
  static load(): Promise<void> {
    if (this.loading) return this.loading;
    const manifest = new Promise<AtlasManifest>((resolve, reject) => resources.load('sprites/atlas', JsonAsset, (error, asset) => error ? reject(error) : resolve(asset.json as AtlasManifest)));
    const image = (name: string) => new Promise<Texture2D>((resolve, reject) => resources.load(`sprites/${name}`, ImageAsset, (error, asset) => {
      if (error) { reject(error); return; }
      const texture = new Texture2D(); texture.image = asset; resolve(texture);
    }));
    this.loading = Promise.all([manifest, image('weapons'), image('items')]).then(([atlas, weapons, items]) => {
      const textures = { weapons, items };
      const entries = Object.keys(DEFS).flatMap(kind => Array.from({ length: kind === 'grip' ? 1 : MAX_LEVEL }, (_, index) => `${kind}-${index + 1}`));
      // Validate both sheets before publishing any frame, so a bad atlas cannot mix art styles.
      for (const key of entries) {
        const entry = atlas.frames[key], texture = entry && textures[entry.sheet];
        if (!entry || !texture || entry.rect.length !== 4) throw new Error(`Missing sprite: ${key}`);
        const [x, y, width, height] = entry.rect;
        if (!entry.rect.every(Number.isInteger) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > texture.width || y + height > texture.height)
          throw new Error(`Invalid sprite bounds: ${key}`);
      }
      for (const key of entries) {
        const entry = atlas.frames[key], [x, y, width, height] = entry.rect, frame = new SpriteFrame();
        frame.name = key;
        frame.texture = textures[entry.sheet]; frame.rect = new Rect(x, y, width, height);
        frame.originalSize = new Size(width, height); frame.packable = false;
        this.frames.set(key, frame);
      }
      this.ready = true;
    });
    return this.loading;
  }
}
