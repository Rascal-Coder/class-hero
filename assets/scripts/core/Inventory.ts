export type Kind = 'grip' | 'barrel' | 'stock' | 'scope' | 'grenade' | 'underbarrel' | 'magazine' | 'medkit';
export type Place = { area: 'board'; x: number; y: number } | { area: 'stash'; slot: number };
export interface Item { id: number; kind: Kind; level: number; place: Place; fixed?: boolean }
export interface Definition { name: string; subtitle: string; w: number; h: number; price: number; color: string }
export const COLS = 6, ROWS = 5, STASH_SIZE = 10, MAX_LEVEL = 5;
export const DEFS: Record<Kind, Definition> = {
  grip: { name: '橡皮握把', subtitle: '唯一握把 · 与初始发射器固定，拖动移动整枪', w: 1, h: 1, price: 0, color: '#eaa293' },
  barrel: { name: '尺子发射器', subtitle: '连接握把或另一根发射器 · 火力 +651', w: 3, h: 1, price: 15, color: '#eabd64' },
  stock: { name: '回形针枪托', subtitle: '连接发射器左侧 · 命中 +5%', w: 2, h: 1, price: 15, color: '#80b6a9' },
  scope: { name: '圆规瞄具', subtitle: '安装在最上层发射器上方 · 暴击 +5%', w: 1, h: 1, price: 10, color: '#a4b6ca' },
  grenade: { name: '纸团炸弹', subtitle: '独立放置 · 范围火力 +188', w: 1, h: 1, price: 25, color: '#e2d9bc' },
  underbarrel: { name: '下挂手榴弹', subtitle: '连接枪口下方 · 射击前投掷，范围火力 +260', w: 1, h: 1, price: 30, color: '#92ae84' },
  magazine: { name: '订书钉弹匣', subtitle: '连接发射器下方 · 弹射伤害 +32', w: 1, h: 1, price: 25, color: '#98b8cf' },
  medkit: { name: '牛奶补给', subtitle: '放进书包 · 每波恢复 120 点体力', w: 1, h: 1, price: 55, color: '#8fbfa2' },
};
export interface Attack { kind: 'grenade' | 'underbarrel' | 'barrel'; level: number }
export interface Stats { damage: number; accuracy: number; crit: number; critDamage: number; bounce: number; barrels: number; grenades: number; healing: number; attacks: Attack[] }
export interface MoveResult { ok: boolean; reason: string; merged?: boolean }
export interface Offer { kind: Kind; level: number; price: number; sold: boolean }
export class Inventory {
  items: Item[] = [];
  nextId = 1;
  revision = 0;
  constructor(initial = true) {
    if (initial) {
      this.add('grip', { area: 'board', x: 2, y: 3 }).fixed = true;
      this.add('barrel', { area: 'board', x: 2, y: 2 }).fixed = true;
    }
  }
  add(kind: Kind, place: Place, level = 1): Item {
    if (kind === 'grip' && this.items.some(i => i.kind === 'grip')) throw new Error('只能有一个握把');
    const item: Item = { id: this.nextId++, kind, level, place };
    this.items.push(item); this.revision++; return item;
  }
  get(id: number) { return this.items.find(i => i.id === id); }
  occupied(x: number, y: number, except: number[] = []): Item | undefined {
    return this.items.find(i => {
      if (except.includes(i.id) || i.place.area !== 'board') return false;
      const d = DEFS[i.kind];
      return x >= i.place.x && x < i.place.x + d.w && y >= i.place.y && y < i.place.y + d.h;
    });
  }
  freeSlot(): number { return Array.from({ length: STASH_SIZE }, (_, i) => i).find(slot => !this.items.some(i => i.place.area === 'stash' && i.place.slot === slot)) ?? -1; }
  /** Directional sockets, independent of visual sprite bounds. */
  linked(a: Item, b: Item): boolean {
    if (a.place.area !== 'board' || b.place.area !== 'board') return false;
    const [x, y, u, v] = [a.place.x, a.place.y, b.place.x, b.place.y];
    if (a.kind === 'barrel' && b.kind === 'barrel') return x === u && Math.abs(y - v) === 1;
    if (a.kind !== 'barrel' && b.kind === 'barrel') return this.linked(b, a);
    if (a.kind !== 'barrel') return false;
    if (b.kind === 'grip') return u === x && v === y + 1;
    if (b.kind === 'stock') return u + 2 === x && v === y;
    if (b.kind === 'scope') return u === x && v === y - 1;
    if (b.kind === 'magazine') return u === x + 1 && v === y + 1;
    if (b.kind === 'underbarrel') return u === x + 2 && v === y + 1;
    return false;
  }
  connected(start: Item, items = this.items): Item[] {
    const result = [start];
    for (let index = 0; index < result.length; index++)
      for (const item of items) if (!result.includes(item) && this.linked(result[index], item)) result.push(item);
    return result;
  }
  isFixed(item: Item): boolean { return item.kind === 'grip' || item.fixed === true; }
  movingIds(item: Item): number[] { return item.kind === 'grip' && item.place.area === 'board' ? this.connected(item).map(i => i.id) : [item.id]; }
  stats(excluded: number[] = []): Stats {
    const equipped = this.items.filter(i => i.place.area === 'board' && !excluded.includes(i.id));
    const active = new Set<Item>();
    for (const grip of equipped.filter(i => i.kind === 'grip')) for (const i of this.connected(grip, equipped)) active.add(i);
    const count = (kind: Kind) => Array.from(active).filter(i => i.kind === kind).reduce((s, i) => s + i.level, 0);
    const barrels = Array.from(active).filter(i => i.kind === 'barrel');
    const tools = equipped.filter(i => i.kind === 'grenade' || (i.kind === 'underbarrel' && active.has(i)));
    const attacks: Attack[] = [...tools, ...barrels].map(i => ({ kind: i.kind as Attack['kind'], level: i.level }));
    const toolDamage = tools.reduce((s, i) => s + i.level * (i.kind === 'underbarrel' ? 260 : 188), 0);
    const stock = Array.from(active).filter(i => i.kind === 'stock').reduce((n, i) => n + (i.level === 1 ? 5 : 9 + (i.level - 2) * 4), 0);
    return { damage: count('barrel') * 651 + toolDamage, accuracy: Math.min(100, 85 + stock), crit: Math.min(80, 3 + count('scope') * 5), critDamage: 150,
      bounce: count('magazine') * 32, barrels: barrels.length, grenades: tools.length, attacks, healing: equipped.filter(i => i.kind === 'medkit').reduce((s, i) => s + i.level * 120, 0) };
  }
  at(target: Place, except: number): Item | undefined {
    return this.items.find(i => i.id !== except && (target.area === 'board'
      ? i.place.area === 'board' && i.place.x === target.x && i.place.y === target.y
      : i.place.area === 'stash' && i.place.slot === target.slot));
  }
  assemblyValid(items: Item[]): boolean {
    const equipped = items.filter(i => i.place.area === 'board');
    const grips = items.filter(i => i.kind === 'grip');
    if (grips.length !== 1 || grips[0].place.area !== 'board') return false;
    const connected = this.connected(grips[0], equipped);
    return equipped.every(i => ['grenade', 'medkit'].includes(i.kind) || connected.includes(i));
  }
  /** The complete translated footprint drives validation and placement highlights. */
  footprint(item: Item, target: Place): Item[] {
    const dx = item.place.area === 'board' && target.area === 'board' ? target.x - item.place.x : 0;
    const dy = item.place.area === 'board' && target.area === 'board' ? target.y - item.place.y : 0;
    return this.movingIds(item).map(id => this.get(id)!).map(part => ({ ...part, place: part.id === item.id || part.place.area !== 'board' || target.area !== 'board'
      ? { ...target } : { area: 'board', x: part.place.x + dx, y: part.place.y + dy } }));
  }
  validate(item: Item, target: Place): MoveResult {
    const ids = this.movingIds(item);
    if (target.area === 'stash' && this.isFixed(item)) return { ok: false, reason: '初始握把和发射器不可拆卸' };
    if (item.kind === 'barrel' && item.fixed && target.area === 'board' && (item.place.area !== 'board' || target.x !== item.place.x || target.y !== item.place.y)) return { ok: false, reason: '初始发射器只能放回原安装位' };
    if (target.area === 'stash') {
      if (!Number.isInteger(target.slot) || target.slot < 0 || target.slot >= STASH_SIZE) return { ok: false, reason: '暂存位置超出范围' };
    } else {
      const d = DEFS[item.kind];
      if (!Number.isInteger(target.x) || !Number.isInteger(target.y) || target.x < 0 || target.y < 0 || target.x + d.w > COLS || target.y + d.h > ROWS) return { ok: false, reason: '超出书包边界' };
    }
    const there = this.at(target, item.id);
    if (there && !ids.includes(there.id) && there.kind === item.kind) {
      if (this.isFixed(item)) return { ok: false, reason: '将配件拖到初始发射器上合成' };
      if (there.level !== item.level) return { ok: false, reason: '同类同级部件才能合成' };
      if (there.level >= MAX_LEVEL) return { ok: false, reason: '部件已满级' };
      if (!this.assemblyValid(this.items.filter(i => i.id !== item.id))) return { ok: false, reason: '请先拖走连接在此部件上的配件' };
      return { ok: true, reason: `合成为 ${there.level + 1} 级部件`, merged: true };
    }
    if (target.area === 'stash' && there) return { ok: false, reason: '这个暂存格已经有物品' };
    const moved = this.footprint(item, target);
    for (const part of moved) {
      if (part.place.area !== 'board') continue;
      const s = DEFS[part.kind], p = part.place;
      if (p.x < 0 || p.y < 0 || p.x + s.w > COLS || p.y + s.h > ROWS) return { ok: false, reason: '整把武器需要完整空间' };
      for (let y = p.y; y < p.y + s.h; y++) for (let x = p.x; x < p.x + s.w; x++)
        if (this.occupied(x, y, ids)) return { ok: false, reason: '这里被其他物品占用了' };
    }
    if (!this.assemblyValid([...this.items.filter(i => !ids.includes(i.id)), ...moved])) return { ok: false, reason: '配件需要保持与握把连接，请先移动末端配件' };
    return { ok: true, reason: target.area === 'stash' ? '放入暂存区' : '可以安装' };
  }
  move(id: number, target: Place): MoveResult {
    const item = this.get(id);
    if (!item) return { ok: false, reason: '物品不存在' };
    const result = this.validate(item, target);
    if (!result.ok) return result;
    if (result.merged) {
      this.at(target, item.id)!.level++;
      this.items = this.items.filter(i => i.id !== id);
    } else for (const part of this.footprint(item, target)) this.get(part.id)!.place = part.place;
    this.revision++; return result;
  }
  autoPlace(item: Item): MoveResult {
    for (const other of this.items) if (other.id !== item.id && other.kind === item.kind && this.validate(item, other.place).merged) return this.move(item.id, other.place);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const target: Place = { area: 'board', x, y };
      if (this.validate(item, target).ok) return this.move(item.id, target);
    }
    return { ok: false, reason: '暂时没有合适接口，拖动握把调整整枪位置' };
  }
  serialize() { return { items: this.items, nextId: this.nextId }; }
  static restore(data: unknown): Inventory {
    const state = data as { items?: Item[]; nextId?: number };
    if (!state || !Array.isArray(state.items) || state.items.length > 40) throw new Error('Invalid inventory');
    const inv = new Inventory(false), ids = new Set<number>();
    for (const item of state.items) {
      if (!item || !DEFS[item.kind] || !Number.isInteger(item.id) || item.id < 1 || ids.has(item.id) || !Number.isInteger(item.level) || item.level < 1 || item.level > MAX_LEVEL) throw new Error('Invalid item');
      const p = item.place;
      if (!p || (p.area !== 'board' && p.area !== 'stash')) throw new Error('Invalid location');
      if (p.area === 'board') {
        const d = DEFS[item.kind];
        if (!Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x + d.w > COLS || p.y + d.h > ROWS) throw new Error('Invalid cells');
        for (let y = p.y; y < p.y + d.h; y++) for (let x = p.x; x < p.x + d.w; x++) if (inv.occupied(x, y)) throw new Error('Overlapping cells');
      } else if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= STASH_SIZE || inv.items.some(i => i.place.area === 'stash' && i.place.slot === p.slot)) throw new Error('Invalid slot');
      ids.add(item.id); inv.items.push(JSON.parse(JSON.stringify(item)));
    }
    const grips = inv.items.filter(i => i.kind === 'grip');
    if (grips.length !== 1 || grips[0].place.area !== 'board') throw new Error('Invalid grip');
    const base = inv.items.find(i => i.kind === 'barrel' && inv.linked(grips[0], i));
    if (!base || inv.items.some(i => i.fixed && i.id !== base.id && i.id !== grips[0].id) || !inv.assemblyValid(inv.items)) throw new Error('Invalid fixed assembly');
    grips[0].fixed = true; base.fixed = true;
    inv.nextId = Math.max(0, ...Array.from(ids)) + 1; return inv;
  }
}

export function offersFor(wave: number, refresh: number): Offer[] {
  const pattern: [Kind, number, number][][] = [
    [['stock', 1, 15], ['grenade', 1, 25], ['medkit', 2, 55]],
    [['magazine', 1, 25], ['barrel', 1, 15], ['grenade', 2, 45]],
    [['stock', 2, 15], ['scope', 1, 10], ['medkit', 1, 55]],
    [['underbarrel', 1, 30], ['magazine', 1, 25], ['barrel', 2, 35]],
    [['barrel', 1, 15], ['scope', 2, 25], ['grenade', 1, 25]],
  ];
  return pattern[(wave ? wave + 1 + refresh : refresh) % pattern.length].map(([kind, level, price]) => ({ kind, level, price, sold: false }));
}
