import { Color, Graphics, Label, Node, UITransform, Layers, Sprite, SpriteFrame } from 'cc';
import { DEFS, Inventory, Item, Kind } from './core/Inventory';
import { ItemSprites } from './ItemSprites';
import { UiSprites } from './UiSprites';
export const C = { ink: '#293b35', muted: '#76847a', paper: '#f4efdf', white: '#fffaf0', chalk: '#244d43', mint: '#b4d9b5', orange: '#e99761', line: '#d4d7bd', blue: '#8bafc1', red: '#d77666', valid: '#a9efac', invalid: '#efa99e', target: '#ffe45e', slot: '#bdd7d8' };
export class Painter {
  node: Node; labels = new Map<string, Label>(); used = new Set<string>();
  private marks: Graphics; private sprites: Sprite[] = []; private spriteCount = 0;
  private drawRoot: Node; private batches: Graphics[] = []; private batchCount = 0;
  private order = 0; private pending = true; private foreground = 0; private current!: Graphics;
  constructor(parent: Node, name: string) {
    this.node = new Node(name); this.node.layer = Layers.Enum.UI_2D; parent.addChild(this.node);
    this.node.addComponent(UITransform).setContentSize(480, 960);
    this.node.setPosition(-240, 480);
    this.drawRoot = new Node('Artwork'); this.drawRoot.layer = Layers.Enum.UI_2D; this.node.addChild(this.drawRoot);
    this.drawRoot.addComponent(UITransform);
    const marks = new Node('Highlights'); marks.layer = Layers.Enum.UI_2D; this.node.addChild(marks);
    marks.addComponent(UITransform); this.marks = marks.addComponent(Graphics);
  }
  // Split Graphics around sprites so PNG panels, grid cells and objects retain paint order.
  get g(): Graphics {
    if (this.foreground) return this.marks;
    if (this.pending) {
      let graphics = this.batches[this.batchCount++];
      if (!graphics) {
        const node = new Node(`ink-${this.batches.length}`); node.layer = Layers.Enum.UI_2D; this.drawRoot.addChild(node);
        node.addComponent(UITransform); graphics = node.addComponent(Graphics); this.batches.push(graphics);
      }
      graphics.node.active = true; graphics.clear(); graphics.node.setSiblingIndex(this.order++);
      this.current = graphics; this.pending = false;
    }
    return this.current;
  }
  begin() { this.marks.clear(); this.used.clear(); this.spriteCount = this.batchCount = this.order = this.foreground = 0; this.pending = true; }
  end() {
    this.labels.forEach((label, key) => { label.node.active = this.used.has(key); });
    this.sprites.forEach((sprite, index) => { sprite.node.active = index < this.spriteCount; });
    this.batches.forEach((graphics, index) => { graphics.node.active = index < this.batchCount; });
  }
  sprite(frame: SpriteFrame, x: number, y: number, w: number, h: number, angle = 0, front = false, alpha = 255, sliced = false) {
    let sprite = this.sprites[this.spriteCount++];
    if (!sprite) {
      const node = new Node(`item-sprite-${this.sprites.length}`); node.layer = Layers.Enum.UI_2D;
      this.drawRoot.addChild(node);
      node.addComponent(UITransform); sprite = node.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM; this.sprites.push(sprite);
    }
    sprite.node.active = true; sprite.spriteFrame = frame; sprite.color = new Color(255, 255, 255, alpha);
    sprite.type = sliced ? Sprite.Type.SLICED : Sprite.Type.SIMPLE;
    const scale = sliced ? 0.35 : 1; sprite.node.setScale(scale, scale, 1);
    sprite.node.getComponent(UITransform)!.setContentSize(w / scale, h / scale);
    sprite.node.setPosition(x + w / 2, -y - h / 2); sprite.node.angle = angle;
    const above = front || this.foreground > 0, parent = above ? this.marks.node : this.drawRoot;
    if (sprite.node.parent !== parent) sprite.node.setParent(parent);
    sprite.node.setSiblingIndex(above ? parent.children.length - 1 : this.order++);
    if (!above) this.pending = true;
  }
  /** Price marks and stars paint above item sprites. */
  over(draw: () => void) {
    this.foreground++; try { draw(); } finally { this.foreground--; }
  }
  surface(key: string, x: number, y: number, w: number, h: number, fallback = C.paper, alpha = 255) {
    const frame = UiSprites.frame(key);
    if (frame) this.sprite(frame, x, y, w, h, 0, false, alpha, true);
    else this.box(x, y, w, h, fallback);
  }
  icon(key: string, x: number, y: number, w: number, h: number, front = false): boolean {
    const frame = UiSprites.frame(key); if (!frame) return false;
    const scale = Math.min(w / frame.rect.width, h / frame.rect.height), width = frame.rect.width * scale, height = frame.rect.height * scale;
    this.sprite(frame, x + (w - width) / 2, y + (h - height) / 2, width, height, 0, front); return true;
  }
  color(hex: string) { return new Color().fromHEX(hex); }
  style(fill: string, stroke = C.ink, line = 2) { this.g.fillColor = this.color(fill); this.g.strokeColor = this.color(stroke); this.g.lineWidth = line; }
  box(x: number, y: number, w: number, h: number, fill: string, radius = 8, stroke = C.ink, line = 2) {
    this.style(fill, stroke, line); this.g.roundRect(x, -y - h, w, h, radius); this.g.fill(); if (line) this.g.stroke();
  }
  ellipse(x: number, y: number, rx: number, ry: number, fill: string, stroke = C.ink, line = 2) {
    this.style(fill, stroke, line); this.g.ellipse(x, -y, rx, ry); this.g.fill(); if (line) this.g.stroke();
  }
  path(points: number[][], fill: string, stroke = C.ink, line = 2) {
    this.style(fill, stroke, line); this.g.moveTo(points[0][0], -points[0][1]); for (const [x, y] of points.slice(1)) this.g.lineTo(x, -y);
    this.g.close(); this.g.fill(); if (line) this.g.stroke();
  }
  line(points: number[][], color = C.ink, width = 2) {
    this.g.strokeColor = this.color(color); this.g.lineWidth = width; this.g.moveTo(points[0][0], -points[0][1]); for (const [x, y] of points.slice(1)) this.g.lineTo(x, -y); this.g.stroke();
  }
  corners(x: number, y: number, w: number, h: number, color = C.target, width = 4) {
    this.over(() => {
    const size = Math.min(13, w / 4, h / 4);
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      const points = [[cx, cy + sy * size], [cx, cy], [cx + sx * size, cy]];
      this.line(points, C.ink, width + 3); this.line(points, color, width);
    }
    });
  }
  star(x: number, y: number, radius: number, color = C.target) {
    if (this.icon('star', x - radius, y - radius, radius * 2, radius * 2, true)) return;
    const points = Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.46 : radius;
      return [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
    });
    this.over(() => this.path(points, color, C.ink, 1));
  }
  smoke(x: number, y: number, t: number, scale = 1) {
    const alpha = Math.round(Math.min(1, (1 - t) * 1.6) * 220).toString(16).padStart(2, '0');
    this.over(() => {
      for (let i = 0; i < 7; i++) {
        const angle = i * Math.PI * 2 / 7, distance = (3 + t * 24) * scale;
        const radius = (5 + Math.sin(Math.min(1, t * 1.7) * Math.PI) * 5) * (1 - t * 0.6) * scale;
        this.ellipse(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance * 0.75 - t * 8, radius, radius * 0.85, '#fff9e9' + alpha, '#b6c6ae' + alpha, 0.8);
      }
    });
  }
  text(key: string, value: string | number, x: number, y: number, size = 18, color = C.ink, align: 'left' | 'center' | 'right' = 'center', width = 460, bold = false) {
    this.used.add(key); let label = this.labels.get(key);
    if (!label) {
      const node = new Node(`text-${key}`); node.layer = Layers.Enum.UI_2D; this.node.addChild(node);
      const transform = node.addComponent(UITransform); transform.setContentSize(width, size * 1.65);
      label = node.addComponent(Label); label.fontFamily = 'Microsoft YaHei'; label.useSystemFont = true;
      label.overflow = Label.Overflow.CLAMP; label.enableWrapText = false; this.labels.set(key, label);
    }
    label.node.active = true; label.node.setPosition(x, -y); label.string = String(value); label.fontSize = size; label.lineHeight = size * 1.4;
    label.color = this.color(color); label.isBold = bold;
    const transform = label.node.getComponent(UITransform)!;
    transform.setContentSize(width, size * 1.65); transform.setAnchorPoint(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
    label.horizontalAlign = align === 'left' ? Label.HorizontalAlign.LEFT : align === 'right' ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
  }
}

export function itemArt(p: Painter, kind: Kind, x: number, y: number, cell: number, level = 1, mounted = false) {
  const s = cell / 56, X = (n: number) => x + n * s, Y = (n: number) => y + n * s;
  const frame = ItemSprites.frame(kind, level);
  if (frame) {
    if (mounted && !['grenade', 'medkit'].includes(kind)) {
      const sockets: Partial<Record<Kind, number[]>> = {
        barrel: [-1, -1, 170, 58], stock: [1, 5, 122, 47], grip: [5, -14, 48, 64],
        scope: [3, 7, 50, 59], magazine: [5, -15, 46, 63], underbarrel: [6, -15, 44, 63],
      };
      const [bx, by, bw, bh] = sockets[kind]!;
      p.sprite(frame, X(bx), Y(by), bw * s, bh * s); return;
    }
    // Side-view bounds preserve the existing board sockets and occupied cells.
    const bounds: Record<Kind, number[]> = {
      barrel: [1, 7, 166, 38], stock: [2, 7, 110, 42], grip: [5, 0, 48, 50],
      scope: [4, 0, 48, 52], magazine: [5, 0, 46, 52],
      grenade: [5, 1, 46, 48], underbarrel: [6, 0, 44, 52], medkit: [7, 1, 42, 49],
    };
    const [bx, by, bw, bh] = bounds[kind];
    const scale = Math.min(bw / frame.rect.width, bh / frame.rect.height);
    const w = kind === 'barrel' || kind === 'stock' ? bw : frame.rect.width * scale, h = frame.rect.height * scale;
    p.sprite(frame, X(bx + (bw - w) / 2), Y(by + (bh - h) / 2), w * s, h * s);
    return;
  }
  const box = (a: number, b: number, w: number, h: number, c: string, r = 4) => p.box(X(a), Y(b), w * s, h * s, c, r * s, C.ink, 2.5 * s);
  const line = (pts: number[][], c = C.ink, w = 2) => p.line(pts.map(([a, b]) => [X(a), Y(b)]), c, w * s);
  if (kind === 'barrel') {
    box(8, 10, 144, 35, '#795c3a'); box(8, 7, 143, 30, level > 1 ? '#dba267' : '#eabc62');
    box(150, 14, 14, 20, '#425e51', 2); box(1, 16, 12, 23, '#506857', 2);
    for (let i = 0; i < 12; i++) line([[22 + i * 10, 8], [22 + i * 10, i % 2 ? 15 : 21]], '#856534', 1.6);
    line([[24, 30], [130, 30]], '#fbe2a2', 2.5);
    p.ellipse(X(18), Y(30), 2.5 * s, 2.5 * s, C.ink, C.ink, 0);
  } else if (kind === 'grip') {
    p.path([[X(9), Y(-12)], [X(43), Y(-12)], [X(34), Y(48)], [X(5), Y(48)]], '#dd907e', C.ink, 2.5 * s);
    line([[11, 31], [34, 31]], '#f8c6ac', 3); line([[12, 23], [36, 23]], '#f8c6ac', 3);
    p.path([[X(39), Y(3)], [X(53), Y(3)], [X(50), Y(22)], [X(37), Y(22)]], '#8aa99b', C.ink, 2 * s);
  } else if (kind === 'stock') {
    if (level > 1) {
      p.path([[X(9), Y(8)], [X(110), Y(16)], [X(108), Y(33)], [X(8), Y(49)]], '#da9965', C.ink, 2.8 * s);
      line([[20, 20], [90, 23]], '#f9cb8d', 2); p.ellipse(X(23), Y(30), 3 * s, 3 * s, C.ink, C.ink, 0);
    } else {
      line([[7, 44], [14, 12], [28, 8], [98, 15], [106, 24]], C.ink, 10);
      line([[7, 44], [14, 12], [28, 8], [98, 15], [106, 24]], '#91b5a8', 5);
    }
  } else if (kind === 'scope') {
    box(5, 35, 45, 25, '#5c7c73');
    p.path([[X(15), Y(35)], [X(21), Y(17)], [X(42), Y(24)], [X(40), Y(36)]], '#8cbab4', C.ink, 2.5 * s);
    p.ellipse(X(21), Y(18), 10 * s, 10 * s, '#baddd7', C.ink, 3 * s);
    p.ellipse(X(21), Y(18), 3 * s, 3 * s, '#43605a', C.ink, 0);
  } else if (kind === 'grenade') {
    p.path([[X(10), Y(16)], [X(22), Y(7)], [X(40), Y(9)], [X(49), Y(24)], [X(43), Y(46)], [X(23), Y(50)], [X(8), Y(37)]], '#f9f4de', C.ink, 2.5 * s);
    line([[10, 16], [28, 25], [40, 9]], '#b4b69d'); line([[28, 25], [23, 43], [43, 46]], '#b4b69d');
    line([[21, 8], [23, 0], [32, 0]], C.ink, 3);
  } else if (kind === 'underbarrel') {
    box(17, 0, 24, 14, '#506857', 2);
    box(12, 12, 34, 38, level > 1 ? '#cfb56d' : '#92ae84', 10);
    line([[14, 25], [44, 25]], '#536a4b', 3); line([[14, 36], [44, 36]], '#536a4b', 3);
    line([[27, 15], [27, 47]], '#d8e2b8', 2);
    p.ellipse(X(44), Y(10), 6 * s, 6 * s, '#ffffff00', C.ink, 2 * s);
  } else if (kind === 'magazine') {
    p.path([[X(13), Y(4)], [X(48), Y(12)], [X(39), Y(50)], [X(4), Y(42)]], '#7da2b5', C.ink, 2.5 * s);
    for (let i = 0; i < 3; i++) line([[16 - i * 2, 14 + i * 10], [36 - i * 2, 19 + i * 10]], '#d4e3e4', 4);
  } else {
    box(11, 12, 34, 39, '#d8e7cc');
    p.path([[X(11), Y(12)], [X(19), Y(2)], [X(36), Y(2)], [X(45), Y(12)]], '#85b096', C.ink, 2.5 * s);
    line([[28, 21], [28, 41]], '#638c71', 5); line([[19, 31], [37, 31]], '#638c71', 5);
  }
}

/** Shop cards use the same tier artwork, tilted and fitted inside the icon area. */
export function shopItemArt(p: Painter, kind: Kind, level: number, x: number, y: number, w: number, h: number) {
  const frame = ItemSprites.frame(kind, level);
  if (!frame) {
    const cells = kind === 'barrel' ? 3 : kind === 'stock' ? 2 : 1, cell = Math.min(h, w / cells);
    itemArt(p, kind, x + (w - cell * cells) / 2, y + (h - cell) / 2, cell, level); return;
  }
  const angle = kind === 'barrel' || kind === 'stock' ? 45 : -45, radians = Math.PI / 4;
  const rw = frame.rect.width, rh = frame.rect.height;
  const scale = Math.min(w / (rw * Math.cos(radians) + rh * Math.sin(radians)), h / (rw * Math.sin(radians) + rh * Math.cos(radians)));
  const width = rw * scale, height = rh * scale;
  p.sprite(frame, x + (w - width) / 2, y + (h - height) / 2, width, height, angle);
}

/** Tape is baked into the object PNG. Mounting cuffs overlap the neighboring body. */
export function assemblyArt(p: Painter, _inventory: Inventory, items: Item[], x: number, y: number, cell: number, pulse?: { id: number; bump: number }) {
  const ordered = [...items].sort((a, b) => Number(a.kind !== 'barrel') - Number(b.kind !== 'barrel'));
  for (const item of ordered) if (item.place.area === 'board') {
    const bump = pulse?.id === item.id ? pulse.bump : 0;
    itemArt(p, item.kind, x + item.place.x * cell - DEFS[item.kind].w * cell * bump / 2, y + item.place.y * cell - cell * bump / 2, cell * (1 + bump), item.level, true);
  }
}

export function student(p: Painter, x: number, y: number, size: number, pose = 0, kind = -1, hit = false) {
  const s = size / 64, bob = Math.sin(pose) * 2 * s;
  p.ellipse(x, y + 34 * s, 27 * s, 7 * s, '#293b351d', C.ink, 0);
  p.box(x - 17 * s, y + 15 * s, 12 * s, 20 * s, '#3a4c46', 5 * s, C.ink, 1.5 * s);
  p.box(x + 5 * s, y + 15 * s + Math.sin(pose) * 3 * s, 12 * s, 20 * s, '#3a4c46', 5 * s, C.ink, 1.5 * s);
  if (kind < 0) p.box(x - 33 * s, y - 12 * s + bob, 20 * s, 34 * s, '#d48f62', 8 * s, C.ink, 2.5 * s);
  p.ellipse(x, y - 1 * s + bob, 26 * s, 32 * s, hit ? '#fffaf0' : kind === 2 ? '#d2d6bc' : '#e6c9a0', C.ink, 2.8 * s);
  p.path([[x - 23 * s, y + 8 * s + bob], [x + 23 * s, y + 8 * s + bob], [x + 17 * s, y + 27 * s + bob], [x - 17 * s, y + 27 * s + bob]], kind < 0 ? '#789b9c' : kind === 3 ? '#af8579' : '#91a7b2', C.ink, 2 * s);
  p.path([[x - 8 * s, y + 8 * s + bob], [x + 8 * s, y + 8 * s + bob], [x, y + 22 * s + bob]], '#d4725f', C.ink, 1.4 * s);
  p.line([[x - 20 * s, y - 24 * s + bob], [x - 10 * s, y - 32 * s + bob], [x + 1 * s, y - 28 * s + bob], [x + 5 * s, y - 35 * s + bob], [x + 19 * s, y - 24 * s + bob]], C.ink, 4 * s);
  const look = kind < 0 ? 5 : -3;
  p.ellipse(x - 9 * s + look * s, y - 9 * s + bob, 2.2 * s, 4 * s, C.ink, C.ink, 0);
  p.ellipse(x + 9 * s + look * s, y - 9 * s + bob, 2.2 * s, 4 * s, C.ink, C.ink, 0);
  p.line([[x - 3 * s + look * s, y + bob], [x + 4 * s + look * s, y + 1 * s + bob]], C.ink, 2 * s);
  if (kind === 3) { p.ellipse(x - 10 * s, y - 9 * s + bob, 8 * s, 7 * s, '#ffffff00', C.ink, 2 * s); p.ellipse(x + 9 * s, y - 9 * s + bob, 8 * s, 7 * s, '#ffffff00', C.ink, 2 * s); }
  if (kind === 1) p.box(x - 31 * s, y + 2 * s + bob, 21 * s, 24 * s, '#e9d690', 2 * s, C.ink, 2 * s);
}
