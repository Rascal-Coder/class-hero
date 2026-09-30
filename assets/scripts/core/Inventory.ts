export type Kind = 'grip' | 'barrel' | 'stock' | 'scope' | 'grenade' | 'magazine' | 'medkit';
export type Place = { area: 'board'; x: number; y: number } | { area: 'stash'; slot: number };
export interface Item { id: number; kind: Kind; level: number; place: Place }
export interface Definition { name: string; subtitle: string; w: number; h: number; price: number; color: string }
export const COLS = 6, ROWS = 5, STASH_SIZE = 10;
export const DEFS: Record<Kind, Definition> = {
  grip: { name: '橡皮握把', subtitle: '武器的核心，拖动它移动整把武器', w: 1, h: 1, price: 20, color: '#eaa293' },
  barrel: { name: '尺子发射器', subtitle: '连接握把或另一根发射器 · 火力 +651', w: 3, h: 1, price: 15, color: '#eabd64' },
  stock: { name: '回形针枪托', subtitle: '连接发射器左侧 · 命中 +5%', w: 2, h: 1, price: 15, color: '#80b6a9' },
  scope: { name: '圆规瞄具', subtitle: '安装在最上层发射器上方 · 暴击 +5%', w: 1, h: 1, price: 10, color: '#a4b6ca' },
  grenade: { name: '纸团炸弹', subtitle: '独立放置 · 范围火力 +188', w: 1, h: 1, price: 25, color: '#e2d9bc' },
  magazine: { name: '订书钉弹匣', subtitle: '连接发射器下方 · 弹射伤害 +32', w: 1, h: 1, price: 25, color: '#98b8cf' },
  medkit: { name: '牛奶补给', subtitle: '放进书包 · 每波恢复 120 点体力', w: 1, h: 1, price: 55, color: '#8fbfa2' },
};
export interface Stats { damage: number; accuracy: number; crit: number; critDamage: number; bounce: number; barrels: number; grenades: number; healing: number }
export interface MoveResult { ok: boolean; reason: string; merged?: boolean; replaced?: boolean }
export interface Offer { kind: Kind; level: number; price: number; sold: boolean }
export class Inventory {
  items: Item[] = [];
  nextId = 1;
  revision = 0;
  constructor(initial = true) {
    if (initial) {
      this.add('grip', { area: 'board', x: 2, y: 3 });
      this.add('barrel', { area: 'board', x: 2, y: 2 });
    }
  }
  add(kind: Kind, place: Place, level = 1): Item {
    const item = { id: this.nextId++, kind, level, place };
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
    return false;
  }
  connected(start: Item, items = this.items): Item[] {
    const result = [start];
    for (let index = 0; index < result.length; index++)
      for (const item of items) if (!result.includes(item) && this.linked(result[index], item)) result.push(item);
    return result;
  }
  movingIds(item: Item): number[] { return item.kind === 'grip' && item.place.area === 'board' ? this.connected(item).map(i => i.id) : [item.id]; }
  stats(excluded: number[] = []): Stats {
    const equipped = this.items.filter(i => i.place.area === 'board' && !excluded.includes(i.id));
    const active = new Set<Item>();
    for (const grip of equipped.filter(i => i.kind === 'grip')) for (const i of this.connected(grip, equipped)) active.add(i);
    const count = (kind: Kind) => Array.from(active).filter(i => i.kind === kind).reduce((s, i) => s + i.level, 0);
    const grenades = equipped.filter(i => i.kind === 'grenade').reduce((s, i) => s + i.level, 0);
    const stock = Array.from(active).filter(i => i.kind === 'stock').reduce((n, i) => n + (i.level === 1 ? 5 : 9 + (i.level - 2) * 4), 0);
    return { damage: count('barrel') * 651 + grenades * 188, accuracy: Math.min(100, 85 + stock), crit: Math.min(80, 3 + count('scope') * 5), critDamage: 150,
      bounce: count('magazine') * 32, barrels: count('barrel'), grenades, healing: equipped.filter(i => i.kind === 'medkit').reduce((s, i) => s + i.level * 120, 0) };
  }
  validate(item: Item, target: Place): MoveResult {
    const ids = this.movingIds(item);
    if (target.area === 'stash') {
      if (target.slot < 0 || target.slot >= STASH_SIZE) return { ok: false, reason: '暂存位置超出范围' };
      const there = this.items.find(i => i.place.area === 'stash' && i.place.slot === target.slot && i.id !== item.id);
      return there ? { ok: false, reason: '这个暂存格已经有物品' } : { ok: true, reason: '放入暂存区' };
    }
    const d = DEFS[item.kind];
    if (target.x < 0 || target.y < 0 || target.x + d.w > COLS || target.y + d.h > ROWS) return { ok: false, reason: '超出书包边界' };
    const displaced = this.items.filter(i => !ids.includes(i.id) && i.place.area === 'board' && i.place.x === target.x && i.place.y === target.y && i.kind === item.kind);
    // The video demonstrates replacing the existing stock; no automatic same-item merge.
    const replacement = displaced.length === 1 && item.kind === 'stock' ? displaced[0] : undefined;
    if (replacement && this.freeSlot() === -1 && item.place.area !== 'stash') return { ok: false, reason: '需要一个暂存格存放旧枪托' };
    const ignore = replacement ? [...ids, replacement.id] : ids;
    const dx = item.place.area === 'board' ? target.x - item.place.x : 0;
    const dy = item.place.area === 'board' ? target.y - item.place.y : 0;
    const moved = ids.map(id => this.get(id)!).map(i => ({ ...i, place: (i.id === item.id || i.place.area !== 'board' ? target : { area: 'board', x: i.place.x + dx, y: i.place.y + dy }) as Place }));
    for (const part of moved) {
      if (part.place.area !== 'board') continue;
      const s = DEFS[part.kind], p = part.place;
      if (p.x < 0 || p.y < 0 || p.x + s.w > COLS || p.y + s.h > ROWS) return { ok: false, reason: '整把武器需要完整空间' };
      for (let y = p.y; y < p.y + s.h; y++) for (let x = p.x; x < p.x + s.w; x++)
        if (this.occupied(x, y, ignore)) return { ok: false, reason: '这里被其他物品占用了' };
    }
    if (!['grip', 'grenade', 'medkit'].includes(item.kind)) {
      const probe = moved.find(i => i.id === item.id)!;
      const rest = this.items.filter(i => !ignore.includes(i.id));
      if (!rest.some(i => this.linked(probe, i))) return { ok: false, reason: '需要对准绿色的武器接口' };
    }
    return { ok: true, reason: replacement ? '替换枪托，旧件返回暂存区' : '可以安装', replaced: !!replacement };
  }
  move(id: number, target: Place): MoveResult {
    const item = this.get(id);
    if (!item) return { ok: false, reason: '物品不存在' };
    const result = this.validate(item, target);
    if (!result.ok) return result;
    if (target.area === 'stash') { item.place = { ...target }; this.revision++; return result; }
    const ids = this.movingIds(item);
    if (result.replaced) {
      const old = this.items.find(i => i.id !== id && i.kind === item.kind && i.place.area === 'board' && i.place.x === target.x && i.place.y === target.y)!;
      old.place = { area: 'stash', slot: item.place.area === 'stash' ? item.place.slot : this.freeSlot() };
    }
    const dx = item.place.area === 'board' ? target.x - item.place.x : 0;
    const dy = item.place.area === 'board' ? target.y - item.place.y : 0;
    for (const part of this.items.filter(i => ids.includes(i.id))) {
      if (part.id !== item.id && part.place.area === 'board') part.place = { area: 'board', x: part.place.x + dx, y: part.place.y + dy };
    }
    item.place = { ...target }; this.revision++; return result;
  }
  autoPlace(item: Item): MoveResult {
    if (item.kind === 'stock') {
      const previous = this.items.find(i => i.id !== item.id && i.kind === 'stock' && i.level < item.level && i.place.area === 'board');
      if (previous && this.validate(item, previous.place).ok) return this.move(item.id, previous.place);
    }
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
      if (!DEFS[item.kind] || !Number.isInteger(item.id) || ids.has(item.id) || !Number.isInteger(item.level) || item.level < 1 || item.level > 5) throw new Error('Invalid item');
      const p = item.place;
      if (!p || (p.area !== 'board' && p.area !== 'stash')) throw new Error('Invalid location');
      if (p.area === 'board') {
        const d = DEFS[item.kind];
        if (!Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x + d.w > COLS || p.y + d.h > ROWS) throw new Error('Invalid cells');
        for (let y = p.y; y < p.y + d.h; y++) for (let x = p.x; x < p.x + d.w; x++) if (inv.occupied(x, y)) throw new Error('Overlapping cells');
      } else if (!Number.isInteger(p.slot) || p.slot < 0 || p.slot >= STASH_SIZE || inv.items.some(i => i.place.area === 'stash' && i.place.slot === p.slot)) throw new Error('Invalid slot');
      ids.add(item.id); inv.items.push(JSON.parse(JSON.stringify(item)));
    }
    inv.nextId = Math.max(0, ...Array.from(ids)) + 1; return inv;
  }
}

export function offersFor(wave: number, refresh: number): Offer[] {
  const pattern: [Kind, number, number][][] = [
    [['stock', 1, 15], ['grenade', 1, 25], ['medkit', 2, 55]],
    [['magazine', 1, 25], ['barrel', 1, 15], ['grenade', 2, 45]],
    [['stock', 2, 15], ['scope', 1, 10], ['medkit', 1, 55]],
    [['grip', 1, 20], ['magazine', 1, 25], ['barrel', 2, 35]],
    [['barrel', 1, 15], ['scope', 2, 25], ['grenade', 1, 25]],
  ];
  return pattern[(wave ? wave + 1 + refresh : refresh) % pattern.length].map(([kind, level, price]) => ({ kind, level, price, sold: false }));
}
