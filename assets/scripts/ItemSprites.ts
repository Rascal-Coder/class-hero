import { ImageAsset, JsonAsset, Rect, Size, SpriteFrame, Texture2D, resources } from 'cc';
import { DEFS, Kind, MAX_LEVEL } from './core/Inventory';

interface AtlasEntry { sheet: 'weapons' | 'items'; rect: [number, number, number, number] }
interface AtlasManifest { frames: Record<string, AtlasEntry> }

/** One shared texture per sheet; all inventory, drag and combat views reuse these frames. */
export type TapeKind = 'h' | 'v' | 'x' | 'l' | 'double' | 'wrap';
const TAPE_KINDS: TapeKind[] = ['h', 'v', 'x', 'l', 'double', 'wrap'];

export class ItemSprites {
  private static frames = new Map<string, SpriteFrame>();
  private static tapes = new Map<TapeKind, SpriteFrame>();
  private static loading: Promise<void> | null = null;
  static ready = false;
  static frame(kind: Kind, level: number): SpriteFrame | undefined {
    return this.frames.get(`${kind}-${Math.max(1, Math.min(MAX_LEVEL, Math.round(level)))}`);
  }
  static tape(kind: TapeKind): SpriteFrame | undefined { return this.tapes.get(kind); }
  static load(): Promise<void> {
    if (this.loading) return this.loading;
    const manifest = new Promise<AtlasManifest>((resolve, reject) => resources.load('sprites/atlas', JsonAsset, (error, asset) => error ? reject(error) : resolve(asset.json as AtlasManifest)));
    const image = (name: string) => new Promise<Texture2D>((resolve, reject) => resources.load(`sprites/${name}`, ImageAsset, (error, asset) => {
      if (error) { reject(error); return; }
      const texture = new Texture2D(); texture.image = asset; resolve(texture);
    }));
    const tapeImages = Promise.all(TAPE_KINDS.map(kind => image(`tape-${kind}`).then(texture => ({ kind, texture })).catch(() => null)));
    this.loading = Promise.all([manifest, image('weapons'), image('items'), tapeImages]).then(([atlas, weapons, items, tapes]) => {
      const textures = { weapons, items };
      const entries = Object.keys(DEFS).flatMap(kind => Array.from({ length: MAX_LEVEL }, (_, index) => `${kind}-${index + 1}`));
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
      for (const tape of tapes) if (tape) {
        const frame = new SpriteFrame();
        frame.name = `tape-${tape.kind}`; frame.texture = tape.texture;
        frame.rect = new Rect(0, 0, tape.texture.width, tape.texture.height);
        frame.originalSize = new Size(tape.texture.width, tape.texture.height); frame.packable = false;
        this.tapes.set(tape.kind, frame);
      }
      this.ready = true;
    });
    return this.loading;
  }
}
