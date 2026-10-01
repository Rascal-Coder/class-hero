import { ImageAsset, JsonAsset, Rect, Size, SpriteFrame, Texture2D, resources } from 'cc';

export class UiSprites {
  private static frames = new Map<string, SpriteFrame>();
  private static loading: Promise<void> | null = null;
  static frame(key: string) { return this.frames.get(key); }
  static load(): Promise<void> {
    if (this.loading) return this.loading;
    const manifest = new Promise<Record<string, { rect: number[] }>>((resolve, reject) => resources.load('sprites/ui-atlas', JsonAsset, (error, asset) => error ? reject(error) : resolve(asset.json!.frames)));
    const image = new Promise<ImageAsset>((resolve, reject) => resources.load('sprites/ui', ImageAsset, (error, asset) => error ? reject(error) : resolve(asset)));
    this.loading = Promise.all([manifest, image]).then(([entries, asset]) => {
      const texture = new Texture2D(); texture.image = asset;
      for (const [key, entry] of Object.entries(entries)) {
        const [x, y, w, h] = entry.rect;
        if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > texture.width || y + h > texture.height) throw Error(`Invalid UI sprite: ${key}`);
        const frame = new SpriteFrame(); frame.name = `ui-${key}`; frame.texture = texture;
        frame.rect = new Rect(x, y, w, h); frame.originalSize = new Size(w, h); frame.packable = false;
        const inset = Math.round(Math.min(w, h) * 0.2);
        frame.insetLeft = frame.insetRight = frame.insetTop = frame.insetBottom = inset;
        // Keep the painted binding loops inside the fixed top/bottom slices.
        if (key === 'panel-notebook') frame.insetTop = frame.insetBottom = Math.floor(h / 2) - 1;
        this.frames.set(key, frame);
      }
    });
    return this.loading;
  }
}
