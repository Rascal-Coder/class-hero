import { Color, Graphics, Label, Node, UITransform, Layers, Sprite, SpriteFrame } from 'cc';
import { Inventory, Item, Kind } from './core/Inventory';
import { ItemSprites, TapeKind } from './ItemSprites';
export const C = { ink: '#293b35', muted: '#76847a', paper: '#f4efdf', white: '#fffaf0', chalk: '#244d43', mint: '#b4d9b5', orange: '#e99761', line: '#d4d7bd', blue: '#8bafc1', red: '#d77666', valid: '#a9efac', invalid: '#efa99e', target: '#ffe45e', slot: '#bdd7d8' };
export class Painter {
  node: Node; g: Graphics; labels = new Map<string, Label>(); used = new Set<string>();
  private marks: Graphics; private sprites: Sprite[] = []; private spriteCount = 0;
  constructor(parent: Node, name: string) {
    this.node = new Node(name); this.node.layer = Layers.Enum.UI_2D; parent.addChild(this.node);
    this.node.addComponent(UITransform).setContentSize(480, 960);
    this.node.setPosition(-240, 480);
    this.g = this.node.addComponent(Graphics);
    const marks = new Node('Highlights'); marks.layer = Layers.Enum.UI_2D; this.node.addChild(marks);
    marks.addComponent(UITransform); this.marks = marks.addComponent(Graphics);
  }
  begin() { this.g.clear(); this.marks.clear(); this.used.clear(); this.spriteCount = 0; }
  end() {
    this.labels.forEach((label, key) => { label.node.active = this.used.has(key); });
    this.sprites.forEach((sprite, index) => { sprite.node.active = index < this.spriteCount; });
  }
  sprite(frame: SpriteFrame, x: number, y: number, w: number, h: number, angle = 0, front = false, alpha = 255) {
    let sprite = this.sprites[this.spriteCount++];
    if (!sprite) {
      const node = new Node(`item-sprite-${this.sprites.length}`); node.layer = Layers.Enum.UI_2D;
      this.node.addChild(node);
      node.addComponent(UITransform); sprite = node.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM; this.sprites.push(sprite);
    }
    sprite.node.active = true; sprite.spriteFrame = frame; sprite.color = new Color(255, 255, 255, alpha);
    sprite.node.getComponent(UITransform)!.setContentSize(w, h);
    sprite.node.setPosition(x + w / 2, -y - h / 2); sprite.node.angle = angle;
    sprite.node.setSiblingIndex(front ? this.marks.node.getSiblingIndex() : 0);
  }
  /** Price marks and stars paint above item sprites. */
  over(draw: () => void) {
    const graphics = this.g; this.g = this.marks; draw(); this.g = graphics;
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
    const graphics = this.g; this.g = this.marks;
    const size = Math.min(13, w / 4, h / 4);
    for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      const points = [[cx, cy + sy * size], [cx, cy], [cx + sx * size, cy]];
      this.line(points, C.ink, width + 3); this.line(points, color, width);
    }
    this.g = graphics;
  }
  star(x: number, y: number, radius: number, color = C.target) {
    const points = Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? radius * 0.46 : radius;
      return [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
    });
    const graphics = this.g; this.g = this.marks; this.path(points, color, C.ink, 1); this.g = graphics;
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

export function itemArt(p: Painter, kind: Kind, x: number, y: number, cell: number, level = 1) {
  const s = cell / 56, X = (n: number) => x + n * s, Y = (n: number) => y + n * s;
  const frame = ItemSprites.frame(kind, level);
  if (frame) {
    // Side-view bounds preserve the existing board sockets and occupied cells.
    const bounds: Record<Kind, number[]> = {
      barrel: [1, 7, 166, 38], stock: [4, 7, 106, 42], grip: [5, -9, 48, 57],
      scope: [4, 1, 48, 54], magazine: [5, 1, 46, 48],
      grenade: [5, 1, 46, 48], underbarrel: [6, 0, 44, 50], medkit: [7, 1, 42, 49],
    };
    const [bx, by, bw, bh] = bounds[kind];
    const scale = Math.min(bw / frame.rect.width, bh / frame.rect.height);
    const w = frame.rect.width * scale, h = frame.rect.height * scale;
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
  const angle = 32, radians = angle * Math.PI / 180;
  const rw = frame.rect.width, rh = frame.rect.height;
  const scale = Math.min(w / (rw * Math.cos(radians) + rh * Math.sin(radians)), h / (rw * Math.sin(radians) + rh * Math.cos(radians)));
  const width = rw * scale, height = rh * scale;
  p.sprite(frame, x + (w - width) / 2, y + (h - height) / 2, width, height, angle);
}

/** Paper-tape overlays pressed across each socket. Sizes stay strap-like, not stretched slabs. */
const TAPE_BOX: Record<TapeKind, number[]> = { h: [74, 18], v: [18, 46], x: [38, 30], l: [40, 42], double: [50, 44], wrap: [34, 32] };
const TAPE_JOINT: Partial<Record<Kind, [TapeKind, number, number, number, number]>> = {
  grip: ['wrap', 26, 32, 26, 8], stock: ['h', 8, 26, 104, 24], scope: ['x', 28, 18, 28, 49],
  magazine: ['l', 82, 32, 28, 16], underbarrel: ['v', 140, 32, 28, 16],
};
export function assemblyArt(p: Painter, inventory: Inventory, items: Item[], x: number, y: number, cell: number) {
  const scale = cell / 56;
  const point = (item: Item, dx: number, dy: number) => item.place.area === 'board'
    ? [x + item.place.x * cell + dx * scale, y + item.place.y * cell + dy * scale] : [x, y];
  const joints: { kind: TapeKind; x: number; y: number; fallback: number[][] }[] = [];
  for (const barrel of items.filter(i => i.kind === 'barrel')) for (const part of items) {
    if (barrel.id === part.id || !inventory.linked(barrel, part)) continue;
    if (part.kind === 'barrel') {
      if (barrel.place.area === 'board' && part.place.area === 'board' && barrel.place.y < part.place.y) {
        const topL = point(barrel, 26, 32), botL = point(part, 26, 20), topR = point(barrel, 128, 32);
        joints.push({ kind: 'double', x: (topL[0] + topR[0]) / 2, y: (topL[1] + botL[1]) / 2, fallback: [topL, botL] });
      }
    } else {
      const socket = TAPE_JOINT[part.kind];
      if (!socket) continue;
      const [kind, ax, ay, bx, by] = socket, a = point(barrel, ax, ay), b = point(part, bx, by);
      joints.push({ kind, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, fallback: [a, b] });
    }
  }
  for (const item of items) if (item.place.area === 'board') itemArt(p, item.kind, x + item.place.x * cell, y + item.place.y * cell, cell, item.level);
  for (const joint of joints) {
    const frame = ItemSprites.tape(joint.kind), [bw, bh] = TAPE_BOX[joint.kind], w = bw * scale, h = bh * scale;
    if (!frame) { p.line(joint.fallback, C.ink, 9 * scale); p.line(joint.fallback, '#cbb98a', 5 * scale); continue; }
    p.sprite(frame, joint.x - w / 2, joint.y - h / 2, w, h, 0, true, 220);
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
