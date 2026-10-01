import { _decorator, Component, input, Input, EventMouse, EventTouch, EventKeyboard, KeyCode, UITransform, Vec3, view, ResolutionPolicy, sys, AudioSource, AudioClip, resources, game, Game } from 'cc';
import { C, Painter, assemblyArt, itemArt, shopItemArt, student } from './Painter';
import { ItemSprites } from './ItemSprites';
import { UiSprites } from './UiSprites';
import { COLS, ROWS, DEFS, Inventory, Item, Place, offersFor, starsFor } from './core/Inventory';
import { Battle } from './core/Battle';
const { ccclass } = _decorator;
type Phase = 'prepare' | 'battle' | 'reward' | 'victory' | 'defeat';
interface Button { x: number; y: number; w: number; h: number; action: () => void; label: string; enabled: boolean }
interface Drag { id: number; source: Place; shop: number; startX: number; startY: number; x: number; y: number; offX: number; offY: number; active: boolean }
interface Returning { parts: Item[]; x: number; y: number; toX: number; toY: number; cell: number; fromCell: number; start: number; hidden: number[] }
interface PlacementEffect { place: Place; item: Item; merged: boolean; start: number }
const SAVE = 'class-gun-hero-v1';

@ccclass('ClassroomGame')
export class ClassroomGame extends Component {
  inventory = new Inventory(); coins = 70; wave = 0; refreshes = 0;
  hp = 1298; maxHp = 1298; damageBonus = 1; offers = offersFor(0, 0);
  phase: Phase = 'prepare'; battle: Battle | null = null; speed = 1;
  back!: Painter; actors!: Painter; overlay!: Painter; floating!: Painter;
  buttons: Button[] = []; drag: Drag | null = null; selected: Item | null = null;
  returning: Returning | null = null;
  placementEffect: PlacementEffect | null = null;
  modal: 'help' | 'pause' | 'item' | 'restart' | null = null;
  focus = -1; clock = 0; toast = ''; toastUntil = 0; feedback = ''; sound = true;
  lastDown = -1; lastDownX = 0; lastDownY = 0;
  soundSource!: AudioSource; clips = new Map<string, AudioClip>(); lastShots = 0;
  spritesReady = false; uiReady = false;
  board = { x: 72, y: 365, cell: 56 }; lastUiRevision = -1;
  onLoad() {
    view.setDesignResolutionSize(480, 960, ResolutionPolicy.SHOW_ALL);
    view.resizeWithBrowserSize(true);
    this.back = new Painter(this.node, 'Notebook'); this.actors = new Painter(this.node, 'Students');
    this.overlay = new Painter(this.node, 'Dialogs'); this.floating = new Painter(this.node, 'Dragging');
    this.soundSource = this.node.addComponent(AudioSource);
    for (const name of ['click', 'snap', 'pop', 'win', 'assemble', 'merge']) resources.load(`audio/${name}`, AudioClip, (err, clip) => { if (!err) this.clips.set(name, clip); });
    this.restore();
    ItemSprites.load().then(() => {
      if (this.isValid) { this.spritesReady = true; this.render(); }
    }).catch(error => console.warn('文具图集加载失败，保留基础绘制。', error));
    UiSprites.load().then(() => { if (this.isValid) { this.uiReady = true; this.render(); } }).catch(error => console.warn('界面图集加载失败。', error));
    input.on(Input.EventType.MOUSE_DOWN, this.mouseDown, this); input.on(Input.EventType.MOUSE_MOVE, this.mouseMove, this); input.on(Input.EventType.MOUSE_UP, this.mouseUp, this);
    input.on(Input.EventType.TOUCH_START, this.touchDown, this); input.on(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.on(Input.EventType.TOUCH_END, this.touchUp, this); input.on(Input.EventType.TOUCH_CANCEL, this.cancelDrag, this);
    input.on(Input.EventType.KEY_DOWN, this.keyDown, this); game.on(Game.EVENT_HIDE, this.onHide, this);
    this.render();
  }
  onDestroy() {
    input.off(Input.EventType.MOUSE_DOWN, this.mouseDown, this); input.off(Input.EventType.MOUSE_MOVE, this.mouseMove, this); input.off(Input.EventType.MOUSE_UP, this.mouseUp, this);
    input.off(Input.EventType.TOUCH_START, this.touchDown, this); input.off(Input.EventType.TOUCH_MOVE, this.touchMove, this); input.off(Input.EventType.TOUCH_END, this.touchUp, this); input.off(Input.EventType.TOUCH_CANCEL, this.cancelDrag, this);
    input.off(Input.EventType.KEY_DOWN, this.keyDown, this); game.off(Game.EVENT_HIDE, this.onHide, this);
  }
  onHide() { this.cancelDrag(); if (this.phase === 'battle') { this.modal = 'pause'; this.render(); } }
  play(name: string) { const clip = this.clips.get(name); if (this.sound && clip) this.soundSource.playOneShot(clip, name === 'pop' ? 0.13 : 0.4); }
  say(message: string) { this.toast = message; this.toastUntil = this.clock + 2.6; }
  save() {
    try { sys.localStorage.setItem(SAVE, JSON.stringify({ version: 1, inventory: this.inventory.serialize(), coins: this.coins, wave: this.wave, refreshes: this.refreshes, hp: this.hp, maxHp: this.maxHp, damageBonus: this.damageBonus, offers: this.offers, sound: this.sound })); } catch { /* Storage may be disabled in private browsing. */ }
  }
  restore() {
    try {
      const raw = sys.localStorage.getItem(SAVE); if (!raw) return; const data = JSON.parse(raw);
      if (data.version !== 1 || !Number.isInteger(data.wave) || data.wave < 0 || data.wave >= 15 || !Number.isFinite(data.coins) || data.coins < 0 || !Number.isFinite(data.hp) || data.hp <= 0 || !Number.isFinite(data.maxHp) || data.maxHp < data.hp || !Number.isFinite(data.damageBonus) || data.damageBonus <= 0) return;
      this.inventory = Inventory.restore(data.inventory); this.coins = data.coins; this.wave = data.wave; this.refreshes = Number.isInteger(data.refreshes) && data.refreshes >= 0 ? data.refreshes : 0;
      this.hp = data.hp; this.maxHp = data.maxHp; this.damageBonus = data.damageBonus; this.sound = data.sound !== false;
      this.offers = offersFor(this.wave, this.refreshes);
      if (Array.isArray(data.offers) && data.offers.length === 3) this.offers.forEach((offer, i) => { if (data.offers[i].kind === offer.kind) offer.sold = !!data.offers[i].sold; });
    } catch { this.inventory = new Inventory(); }
  }
  newRun() { this.inventory = new Inventory(); this.coins = 70; this.wave = this.refreshes = 0; this.hp = this.maxHp = 1298; this.damageBonus = 1; this.offers = offersFor(0, 0); this.phase = 'prepare'; this.battle = null; this.modal = null; this.selected = null; this.placementEffect = null; this.returning = null; this.toast = ''; this.save(); this.render(); }
  point(event: EventMouse | EventTouch) {
    const p = event.getUILocation(); const v = this.node.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
    return { x: v.x + 240, y: 480 - v.y };
  }
  mouseDown(e: EventMouse) { if (e.getButton() === 0) this.down(this.point(e)); }
  mouseMove(e: EventMouse) { this.move(this.point(e)); }
  mouseUp(e: EventMouse) { if (e.getButton() === 0) this.up(this.point(e)); }
  touchDown(e: EventTouch) { this.down(this.point(e)); }
  touchMove(e: EventTouch) { this.move(this.point(e)); }
  touchUp(e: EventTouch) { this.up(this.point(e)); }
  contains(b: { x: number; y: number; w: number; h: number }, x: number, y: number) { return x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h; }
  stashRect(slot: number) { return { x: 57 + (slot % 5) * 76, y: 653 + Math.floor(slot / 5) * 72, w: 62, h: 62 }; }
  stashCell(item: Item) { return Math.min(42, 48 / DEFS[item.kind].w); }
  itemRect(item: Item) {
    const d = DEFS[item.kind];
    if (item.place.area === 'board') return { x: this.board.x + item.place.x * this.board.cell, y: this.board.y + item.place.y * this.board.cell, w: d.w * this.board.cell, h: d.h * this.board.cell };
    return this.stashRect(item.place.slot);
  }
  dragVisual() {
    const drag = this.drag!, item = this.inventory.get(drag.id)!, target = this.dragTarget();
    const result = target ? this.inventory.validate(item, target) : null;
    const cell = target?.area === 'stash' ? this.stashCell(item) : 56;
    if (target?.area === 'stash' && result?.ok) {
      const r = this.stashRect(target.slot);
      return { x: r.x + (r.w - DEFS[item.kind].w * cell) / 2, y: r.y + (r.h - cell) / 2 - 3, cell, target, result };
    }
    if (target?.area === 'board' && result?.ok) return { x: this.board.x + target.x * 56, y: this.board.y + target.y * 56, cell, target, result };
    return { x: drag.x - drag.offX * cell, y: drag.y - drag.offY * cell - 3, cell, target, result };
  }
  placementPulse(item: Item | undefined, merged = false) {
    if (item) {
      this.placementEffect = { place: { ...item.place }, item: { ...item }, merged, start: this.clock };
      this.play(merged ? 'merge' : item.place.area === 'board' && !['grenade', 'medkit'].includes(item.kind) ? 'assemble' : 'snap');
    }
  }
  autoInstall(item: Item) {
    const mergeTarget = this.inventory.items.find(i => i.id !== item.id && i.kind === item.kind && this.inventory.validate(item, i.place).merged);
    const result = this.inventory.autoPlace(item);
    if (result.ok) this.placementPulse(result.merged ? mergeTarget : item, result.merged);
    return result;
  }
  levelStars(p: Painter, item: Pick<Item, 'kind' | 'level'>, x: number, y: number, size = 4) {
    const count = starsFor(item);
    for (let i = 0; i < count; i++) p.star(x + (i - (count - 1) / 2) * (size * 2 + 1), y, size);
  }
  down({ x, y }: { x: number; y: number }) {
    if (this.drag || this.returning) return;
    // Creator synthesizes a touch from desktop mouse input. Treat the pair as one press.
    if (this.clock - this.lastDown < 0.12 && Math.hypot(x - this.lastDownX, y - this.lastDownY) < 2) return;
    this.lastDown = this.clock; this.lastDownX = x; this.lastDownY = y;
    const button = [...this.buttons].reverse().find(b => this.contains(b, x, y));
    if (button) { if (button.enabled) { this.focus = -1; this.play('click'); button.action(); } return; }
    if (this.modal || this.phase !== 'prepare') return;
    const item = [...this.inventory.items].reverse().find(i => this.contains(this.itemRect(i), x, y));
    if (item) {
      const rect = this.itemRect(item);
      this.drag = { id: item.id, source: { ...item.place }, shop: -1, startX: x, startY: y, x, y,
        offX: item.place.area === 'board' ? (x - rect.x) / this.board.cell : DEFS[item.kind].w / 2, offY: item.place.area === 'board' ? (y - rect.y) / this.board.cell : 0.5, active: false };
      return;
    }
    for (let index = 0; index < 3; index++) if (this.contains({ x: 52 + index * 128, y: 797, w: 120, h: 86 }, x, y)) {
      const offer = this.offers[index]; if (offer.sold) return;
      const draft = this.inventory.add(offer.kind, { area: 'stash', slot: -1 }, offer.level);
      this.drag = { id: draft.id, source: { ...draft.place }, shop: index, startX: x, startY: y, x, y, offX: DEFS[draft.kind].w / 2, offY: 0.5, active: false };
      return;
    }
  }
  move({ x, y }: { x: number; y: number }) {
    if (!this.drag) return;
    this.drag.x = x; this.drag.y = y;
    if (!this.drag.active && Math.hypot(x - this.drag.startX, y - this.drag.startY) > 7) { this.drag.active = true; this.placementEffect = null; this.toast = ''; }
    if (this.drag.active) this.render();
  }
  dragTarget(): Place | null {
    const d = this.drag; if (!d) return null;
    for (let slot = 0; slot < 10; slot++) if (this.contains(this.stashRect(slot), d.x, d.y)) return { area: 'stash', slot };
    if (d.y < this.board.y + ROWS * this.board.cell + 12 && d.y > this.board.y - 25) return { area: 'board', x: Math.round((d.x - this.board.x) / this.board.cell - d.offX), y: Math.round((d.y - this.board.y) / this.board.cell - d.offY) };
    return null;
  }
  removeDraft() { if (this.drag && this.drag.shop >= 0) this.inventory.items = this.inventory.items.filter(i => i.id !== this.drag!.id); }
  returnDrag(item: Item, drag: Drag) {
    const rect = this.itemRect(item), def = DEFS[item.kind];
    const cell = drag.shop >= 0 ? Math.min(36, 92 / def.w) : item.place.area === 'stash' ? this.stashCell(item) : 56;
    const parts = this.inventory.movingIds(item).map(id => this.inventory.get(id)!).map(part => ({ ...part, place: { area: 'board' as const,
      x: part.place.area === 'board' && item.place.area === 'board' ? part.place.x - item.place.x : 0,
      y: part.place.area === 'board' && item.place.area === 'board' ? part.place.y - item.place.y : 0 } }));
    const visual = this.dragVisual();
    this.returning = { parts, x: visual.x, y: visual.y, fromCell: visual.cell,
      toX: drag.shop >= 0 ? 52 + drag.shop * 128 + (120 - cell * def.w) / 2 : rect.x + (rect.w - cell * def.w) / 2,
      toY: drag.shop >= 0 ? 807 : rect.y + (rect.h - cell) / 2 - (item.place.area === 'stash' ? 3 : 0), cell, start: this.clock, hidden: drag.shop < 0 ? parts.map(i => i.id) : [] };
  }
  up(p: { x: number; y: number }) {
    const d = this.drag; if (!d) return;
    const item = this.inventory.get(d.id)!;
    if (!d.active) {
      this.removeDraft(); this.drag = null;
      if (d.shop >= 0 && this.coins < this.offers[d.shop].price) this.say('资金不足');
      else { this.selected = { ...item }; this.modal = 'item'; }
      this.render(); return;
    }
    d.x = p.x; d.y = p.y; const target = this.dragTarget();
    if (d.shop >= 0 && this.coins < this.offers[d.shop].price) {
      this.returnDrag(item, d); this.removeDraft(); this.drag = null; this.say('资金不足'); this.render(); return;
    }
    const result = target ? this.inventory.move(d.id, target) : { ok: false, reason: '' };
    if (result.ok) {
      if (d.shop >= 0) { this.coins -= this.offers[d.shop].price; this.offers[d.shop].sold = true; }
      this.placementPulse(result.merged ? this.inventory.at(target!, item.id) : item, result.merged);
      this.save();
    } else { this.returnDrag(item, d); this.removeDraft(); }
    this.drag = null; this.render();
  }
  cancelDrag() { this.removeDraft(); this.drag = null; if (this.back) this.render(); }
  buy(index: number) {
    const offer = this.offers[index]; if (offer.sold) return;
    if (this.coins < offer.price) { this.modal = null; this.say('资金不足'); this.render(); return; }
    const item = this.inventory.add(offer.kind, { area: 'stash', slot: -1 }, offer.level);
    const result = this.autoInstall(item);
    if (!result.ok) {
      const slot = this.inventory.freeSlot();
      if (slot === -1) { this.inventory.items = this.inventory.items.filter(i => i.id !== item.id); this.say('暂存区已满，请先整理书包'); return; }
      item.place = { area: 'stash', slot };
      this.placementPulse(item);
    }
    this.coins -= offer.price; offer.sold = true;
    this.modal = null;
    this.save(); this.render();
  }
  refreshShop() {
    const cost = this.wave === 0 && this.refreshes === 0 ? 0 : 10;
    if (this.coins < cost) { this.say('刷新需要 10 零花钱'); return; }
    this.coins -= cost; this.refreshes++; this.offers = offersFor(this.wave, this.refreshes); this.save(); this.render();
  }
  startBattle() {
    const stats = this.inventory.stats(); if (!stats.barrels) { this.say('先将发射器连接到握把，再出发'); return; }
    this.save(); this.wave++; this.phase = 'battle'; this.modal = null;
    this.hp = Math.min(this.maxHp, this.hp + stats.healing);
    this.battle = new Battle(this.wave, stats, this.hp, this.maxHp, this.damageBonus); this.play('snap'); this.render();
  }
  finishBattle() {
    const battle = this.battle!; this.hp = battle.hp;
    if (battle.state === 'lost') { this.phase = 'defeat'; this.render(); return; }
    const earned = battle.coins + 12; this.coins += earned; this.play('win');
    if (this.wave >= 15) { this.phase = 'victory'; sys.localStorage.removeItem(SAVE); }
    else if (this.wave % 2 === 0) this.phase = 'reward';
    else this.nextPreparation();
    this.render();
  }
  nextPreparation() { this.phase = 'prepare'; this.refreshes = 0; this.offers = offersFor(this.wave, 0); this.save(); this.render(); }
  reward(kind: number) {
    if (kind === 0) this.damageBonus += 0.15;
    if (kind === 1) { this.maxHp += 200; this.hp = Math.min(this.maxHp, this.hp + 400); }
    if (kind === 2) this.coins += 40;
    this.play('snap'); this.nextPreparation();
  }
  keyDown(e: EventKeyboard) {
    if (e.keyCode === KeyCode.ESCAPE) { if (this.drag) this.cancelDrag(); else { this.modal = this.modal ? null : 'pause'; this.render(); } return; }
    if (this.drag || this.returning) return;
    if (e.keyCode === KeyCode.TAB) { const enabled = this.buttons.filter(b => b.enabled); this.focus = (this.focus + 1) % Math.max(1, enabled.length); this.drawFloating(); return; }
    if (e.keyCode === KeyCode.ENTER && this.focus >= 0) { this.buttons.filter(b => b.enabled)[this.focus]?.action(); this.focus = -1; return; }
    if (this.modal) return;
    if (e.keyCode === KeyCode.SPACE) { if (this.phase === 'prepare') this.startBattle(); else if (this.phase === 'battle') { this.modal = 'pause'; this.render(); } }
    if (this.phase === 'prepare') {
      if (e.keyCode === KeyCode.KEY_R) this.refreshShop();
      if (e.keyCode >= KeyCode.DIGIT_1 && e.keyCode <= KeyCode.DIGIT_3) this.buy(e.keyCode - KeyCode.DIGIT_1);
    }
  }
  button(p: Painter, key: string, text: string, x: number, y: number, w: number, h: number, action: () => void, color = C.mint, enabled = true) {
    p.surface(!enabled ? 'button-disabled' : color === C.orange ? 'button-primary' : color === '#e5dfca' || color === '#dce2ca' ? 'button-neutral' : 'button-secondary', x, y, w, h + 3, color);
    if (key === 'pause' && p.icon('pause', x + (w - 28) / 2, y + 2, 28, h - 3)) { /* Icon replaces the pause glyph. */ }
    else {
      const refresh = key === 'refresh';
      if (refresh) p.icon('refresh', x + 9, y + 9, 25, 25);
      p.text(`button-${key}`, text, x + w / 2 + (refresh ? 12 : 0), y + h / 2, 17, enabled ? C.ink : C.muted, 'center', w - (refresh ? 38 : 8), true);
    }
    this.buttons.push({ x, y, w, h, action, label: text, enabled });
  }
  render() {
    this.buttons = []; const p = this.back; p.begin();
    const prep = this.phase === 'prepare'; this.board = prep ? { x: 72, y: 345, cell: 56 } : { x: 72, y: 572, cell: 56 };
    p.box(0, 0, 480, 960, C.paper, 0, C.paper, 0);
    for (let y = 115; y < 960; y += 24) p.line([[16, y], [464, y]], '#e6e5d1', 1);
    p.line([[32, 110], [32, 952]], '#e4baa5', 1);
    p.surface('panel-chalk', -6, -6, 492, 113, C.chalk);
    p.text('subhead', 'AFTER SCHOOL CLUB', 24, 19, 11, '#b9d1bd', 'left', 220);
    p.text('title', '下课别跑', 23, 52, 33, C.white, 'left', 220, true);
    p.text('chapter', '一年三班  /  放学后的操场', 25, 83, 12, '#d7dbc5', 'left', 260);
    p.surface('toast', 298, 25, 98, 34, C.chalk);
    p.icon('coin', 306, 32, 20, 20); p.text('coins', this.coins, 346, 42, 18, '#f7df94', 'center', 56, true);
    this.button(p, 'pause', 'Ⅱ', 412, 27, 43, 32, () => { this.modal = 'pause'; this.render(); }, '#a1bfa5');
    p.text('wave', `${String(this.wave).padStart(2, '0')} / 15 波`, 388, 82, 13, '#d7dbc5', 'right', 115);
    const arenaY = 120, arenaH = prep ? 116 : 345;
    this.corridor(p, arenaY, arenaH, prep);
    this.stats(p, prep ? 260 : 491);
    p.text('board-name', '我的武器书包', 54, prep ? 314 : 537, 18, C.ink, 'left', 240, true);
    p.text('board-count', '6 × 5', 425, prep ? 314 : 537, 13, C.muted, 'right', 90);
    this.drawBoard(p);
    if (prep) this.preparation(p);
    else {
      p.text('battle-note', '书包中的组合，正在操场上发挥威力', 240, 884, 14, C.muted);
      this.button(p, 'speed', `${this.speed}× 速度`, 55, 913, 136, 30, () => { this.speed = this.speed === 1 ? 2 : 1; this.render(); }, '#d6dec5');
      this.button(p, 'pause-bottom', '休息一下', 286, 913, 140, 30, () => { this.modal = 'pause'; this.render(); }, '#d6dec5');
    }
    p.end(); this.renderModal(); this.drawFloating();
    this.lastUiRevision = this.inventory.revision;
  }
  corridor(p: Painter, y: number, h: number, prep: boolean) {
    p.box(16, y + 4, 448, h, '#c1c5a9', 10, C.ink, 0);
    p.box(16, y, 448, h, '#d8dbc3', 10, '#7e8d78', 1.5);
    const wall = y + h * 0.57;
    p.box(18, y + 2, 444, h * 0.57, '#dedbc2', 8, '#dedbc2', 0);
    for (let i = 0; i < 4; i++) {
      const wx = 38 + i * 109;
      p.box(wx, y + 15, 81, prep ? 40 : 101, '#accac4', 2, '#8eaa99', 2);
      p.line([[wx + 40, y + 16], [wx + 40, y + (prep ? 54 : 115)]], '#ece7ce', 3);
      p.line([[wx + 2, y + (prep ? 34 : 66)], [wx + 80, y + (prep ? 34 : 66)]], '#ece7ce', 3);
      p.line([[wx + 9, y + 24], [wx + 28, y + 19]], '#dce9d8', 2);
    }
    p.line([[18, wall], [462, wall]], '#9caa8f', 4);
    p.line([[18, wall + 8], [462, wall + 8]], '#ebe5c9', 3);
    for (let i = 0; i < 5; i++) p.line([[40 + i * 97, wall + 14], [17 + i * 112, y + h - 4]], '#b9c3a3', 1);
    p.line([[20, y + h - 16], [460, y + h - 16]], '#bdc6aa', 1);
    if (prep) { p.box(174, y + 82, 156, 27, '#fffaf0d9', 13, '#b8bda3', 1); p.text('school-sign', '叮铃铃，准备开溜！', 252, y + 96, 12, '#58715d'); }
    else { p.box(183, y + 13, 113, 26, '#f8f0d4', 4, '#7f9279', 1); p.text('school-sign', `第 ${this.wave} 波 · 操场`, 240, y + 26, 13, C.ink, 'center', 110, true); }
  }
  stats(p: Painter, y: number) {
    const excluded = this.drag?.active ? this.inventory.movingIds(this.inventory.get(this.drag.id)!) : [];
    const s = this.inventory.stats(excluded);
    const data = [['火力', Math.round(s.damage * this.damageBonus).toString()], ['命中', `${s.accuracy}%`], ['暴击', `${s.crit}%`], ['暴伤', `${s.critDamage}%`], ['弹射', s.bounce ? `${s.bounce}` : '0%']];
    data.forEach(([name, value], i) => { const x = 72 + i * 84; p.text(`stat-name-${i}`, name, x, y - 8, 12, C.muted, 'center', 70); p.text(`stat-value-${i}`, value, x, y + 14, 22, i === 0 ? '#a25e37' : C.ink, 'center', 80, true); if (i < 4) p.line([[x + 41, y - 12], [x + 41, y + 23]], '#cdd1b9', 1); });
  }
  drawBoard(p: Painter) {
    const { x, y, cell } = this.board;
    p.surface('panel-notebook', x - 17, y - 12, 370, 309);
    const held = this.drag?.active ? this.inventory.get(this.drag.id) : undefined;
    const hidden = held ? this.inventory.movingIds(held) : this.returning?.hidden ?? [];
    const available = new Set<string>(), mergeTargets: Item[] = [];
    if (held) for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const target: Place = { area: 'board', x: col, y: row };
      const result = this.inventory.validate(held, target);
      if (!result.ok) continue;
      if (result.merged) mergeTargets.push(this.inventory.at(target, held.id)!);
      // Grip cells are possible anchors for the entire assembly, as in the reference.
      // Individual parts light their full footprint (including both stock cells).
      if (held.kind === 'grip') { available.add(`${col},${row}`); continue; }
      for (const part of this.inventory.footprint(held, target)) if (part.place.area === 'board') {
        const def = DEFS[part.kind];
        for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) available.add(`${part.place.x + dx},${part.place.y + dy}`);
      }
    }
    for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
      const good = available.has(`${col},${row}`);
      const fill = held ? good ? C.valid : C.invalid : (row + col) % 2 ? '#e7ebd8' : '#e1e7d2';
      p.surface(held ? good ? 'grid-valid' : 'grid-invalid' : 'grid-neutral', x + col * cell + 5, y + row * cell + 5, cell - 10, cell - 10, fill, held ? 255 : 95);
    }
    const items = this.inventory.items.filter(i => i.place.area === 'board' && !hidden.includes(i.id));
    const effect = this.placementEffect, t = effect ? (this.clock - effect.start) / 0.6 : 1;
    const pulse = effect && t < 1 ? { id: effect.item.id, bump: Math.sin(t * Math.PI * 2) * 0.1 * (1 - t) } : undefined;
    assemblyArt(p, this.inventory, items, x, y, cell, pulse);
    for (const item of mergeTargets) if (item.place.area === 'board') p.corners(x + item.place.x * cell + 3, y + item.place.y * cell + 3, DEFS[item.kind].w * cell - 6, cell - 6, C.target, 2);
  }
  preparation(p: Painter) {
    const held = this.drag?.active ? this.inventory.get(this.drag.id) : undefined;
    const target = this.dragTarget();
    for (let slot = 0; slot < 10; slot++) {
      const { x, y, w, h } = this.stashRect(slot);
      const result = held ? this.inventory.validate(held, { area: 'stash', slot }) : null;
      const hover = held && target?.area === 'stash' && target.slot === slot;
      const fill = hover ? result?.ok ? '#d3eeee' : C.invalid : C.slot;
      p.surface(hover ? result?.ok ? 'slot-selected' : 'slot-invalid' : 'slot-empty', x, y, w, h + 3, fill);
      const item = this.inventory.items.find(i => i.place.area === 'stash' && i.place.slot === slot && i.id !== held?.id && !this.returning?.hidden.includes(i.id));
      if (item && !(hover && result?.ok)) { shopItemArt(p, item.kind, item.level, x + 6, y + 5, w - 12, h - 18); this.levelStars(p, item, x + w / 2, y + h - 8, 4); }
      if (result?.merged && !hover) p.corners(x + 3, y + 3, w - 6, h - 6, C.target, 2);
      if (held && result?.ok && !hover) p.line([[x + 22, y + h - 3], [x + w - 22, y + h - 3]], '#65b68c', 3);
    }
    this.offers.forEach((offer, i) => {
      const x = 52 + i * 128;
      p.surface('card-shop', x, 800, 120, 87);
      if (offer.sold) { p.icon('check', x + 43, 821, 34, 34); return; }
      shopItemArt(p, offer.kind, offer.level, x + 10, 802, 100, 48);
      p.over(() => {
        p.box(x + 32, 860, 56, 18, C.white, 8, C.white, 0);
        p.icon('coin', x + 35, 862, 14, 14);
      });
      p.text(`shop-price-${i}`, offer.price, x + 66, 869, 14, this.coins >= offer.price ? '#997141' : '#b47b6a', 'center', 40, true);
      this.levelStars(p, offer, x + 60, 854, 4);
    });
    const cost = this.wave === 0 && this.refreshes === 0 ? '免费' : '10';
    this.button(p, 'refresh', `换一批 · ${cost}`, 53, 904, 154, 42, () => this.refreshShop(), '#d5dfbd');
    this.button(p, 'start', `去操场  →`, 221, 904, 206, 42, () => this.startBattle(), C.orange);
  }
  renderModal() {
    const p = this.overlay; p.begin();
    if (!this.modal && !['reward', 'defeat', 'victory'].includes(this.phase)) { p.end(); return; }
    this.buttons = []; p.box(0, 0, 480, 960, '#172c27d9', 0, C.ink, 0);
    if (this.modal === 'pause') {
      p.surface('panel-dialog', 47, 258, 386, 409);
      p.text('pause-small', '课 间 休 息', 240, 297, 13, C.muted);
      p.text('pause-title', '喘口气，再出发。', 240, 343, 26, C.ink, 'center', 366, true);
      this.button(p, 'resume', '继续游戏', 87, 387, 306, 43, () => { this.modal = null; this.render(); }, C.mint);
      this.button(p, 'guide', '武器拼装说明', 87, 444, 306, 43, () => { this.modal = 'help'; this.render(); }, '#e5dfca');
      this.button(p, 'sound', `声音：${this.sound ? '开' : '关'}`, 87, 501, 144, 39, () => { this.sound = !this.sound; this.save(); this.render(); }, '#e5dfca');
      this.button(p, 'restart', '重新开始', 249, 501, 144, 39, () => { this.modal = 'restart'; this.render(); }, '#e5dfca');
      p.text('pause-tip', '空格：开战 / 暂停    R：刷新商店', 240, 584, 13, C.muted);
      p.text('pause-tip2', '1 / 2 / 3：购买并安装对应商品', 240, 612, 13, C.muted);
    } else if (this.modal === 'help') {
      p.surface('panel-dialog', 30, 156, 420, 666);
      p.text('help-title', '把文具，拼成战斗力。', 240, 196, 24, C.ink, 'center', 410, true);
      const demo = new Inventory();
      demo.add('stock', { area: 'board', x: 0, y: 2 }); demo.add('barrel', { area: 'board', x: 2, y: 1 });
      demo.add('scope', { area: 'board', x: 2, y: 0 }); demo.add('magazine', { area: 'board', x: 3, y: 3 }); demo.add('underbarrel', { area: 'board', x: 4, y: 3 });
      assemblyArt(p, demo, demo.items, 72, 216, 46);
      const notes = ['01  拖握把移动整枪，初始枪管只回原位。', '02  同类同级拖到一起，合成升一级。', '03  绿格可放，黄角锁定当前落点。', '04  配件拖入蓝色暂存格，不参与战斗。', '05  每回合先投道具，再逐根枪管射击。', '06  敌人随后前进一步，进入范围放技能。'];
      notes.forEach((t, i) => p.text(`help-${i}`, t, 58, 407 + i * 43, 16, C.ink, 'left', 375));
      p.text('help-extra', '点击商品可购买并自动安装，也可以直接拖拽。', 240, 692, 12, C.muted);
      this.button(p, 'help-close', '知道了，去拼装', 91, 743, 298, 42, () => { this.modal = null; this.render(); });
    } else if (this.modal === 'restart') {
      p.surface('panel-dialog', 47, 314, 386, 285); p.text('restart-title', '重新放一次学？', 240, 364, 25, C.ink, 'center', 360, true);
      p.text('restart-note', '这次的书包、零花钱和波次会重置。', 240, 410, 15, C.muted);
      this.button(p, 'cancel-restart', '继续这一局', 76, 477, 155, 46, () => { this.modal = 'pause'; this.render(); }, '#dce3cd');
      this.button(p, 'confirm-restart', '重新开始', 249, 477, 155, 46, () => this.newRun(), C.orange);
    } else if (this.modal === 'item' && this.selected) {
      const item = this.selected, def = DEFS[item.kind];
      p.surface('panel-dialog', 40, 271, 400, 372);
      p.text('item-title', def.name, 240, 309, 25, C.ink, 'center', 380, true);
      itemArt(p, item.kind, 240 - def.w * 46 / 2, 349, 46, item.level);
      this.levelStars(p, item, 240, 411, 5);
      p.text('item-level', `占用 ${def.w} × ${def.h} 格`, 240, 435, 14, C.muted);
      const desc = item.kind === 'grip' ? def.subtitle : item.fixed ? '初始发射器不可拆卸 · 可接收同级合成' : item.kind === 'stock' ? `连接左侧 · 命中 +${item.level === 1 ? 5 : 9 + (item.level - 2) * 4}%` : def.subtitle;
      p.text('item-desc', desc, 240, 457, 14, C.ink, 'center', 375);
      const offerIndex = this.offers.findIndex(o => o.kind === item.kind && o.level === item.level && !o.sold);
      const exists = this.inventory.get(item.id);
      if (exists) {
        if (exists.place.area === 'stash') this.button(p, 'auto-install', '寻找接口并安装', 80, 500, 320, 42, () => { const r = this.autoInstall(exists); if (!r.ok) this.say(r.reason); this.modal = null; this.save(); this.render(); }, C.mint);
        else p.text('item-drag-note', this.inventory.isFixed(exists) ? '固定部件不可拆卸' : '拖拽到课桌暂存区可拆下配件', 240, 521, 15, C.muted, 'center', 350);
      } else if (offerIndex >= 0) this.button(p, 'buy', `购买并安装 · ${this.offers[offerIndex].price}`, 80, 500, 320, 42, () => this.buy(offerIndex), C.orange, this.coins >= this.offers[offerIndex].price);
      this.button(p, 'item-close', '返回书包', 80, 563, 320, 38, () => { this.modal = null; this.render(); }, '#dce2ca');
    } else if (this.phase === 'reward') {
      p.text('reward-small', '放学小奖励', 240, 250, 17, '#b2c8af'); p.text('reward-title', '今天，又厉害了一点。', 240, 293, 27, C.white, 'center', 450, true);
      const rewards = [['手工达人', '火力 +15%', 'barrel'], ['运动健将', '体力上限 +200', 'medkit'], ['零花钱自由', '零花钱 +40', 'grenade']] as const;
      rewards.forEach(([name, note, kind], i) => {
        const x = 25 + i * 148; p.surface('card-reward', x, 362, 134, 243);
        const c = kind === 'barrel' ? 32 : 52; itemArt(p, kind, x + (134 - DEFS[kind].w * c) / 2, 389, c);
        p.text(`reward-name-${i}`, name, x + 67, 475, 18, C.ink, 'center', 130, true); p.text(`reward-note-${i}`, note, x + 67, 508, 13, C.muted, 'center', 132);
        this.button(p, `reward-${i}`, '就选这个', x + 9, 550, 116, 34, () => this.reward(i), C.mint);
      });
      p.text('reward-hint', '选择一项，带着新本领继续下一波', 240, 658, 14, '#c4d2bc');
    } else {
      const win = this.phase === 'victory'; p.surface('panel-dialog', 39, 245, 402, 460);
      student(p, 240, 327, 85, 0); p.text('end-title', win ? '放学大作战，通关！' : '被留下补作业了…', 240, 426, 27, C.ink, 'center', 390, true);
      p.text('end-wave', `坚持了 ${this.wave} 波  ·  组合火力 ${this.inventory.stats().damage}`, 240, 477, 17, C.muted);
      p.text('end-note', win ? '15 波挑战完成，你就是操场传说。' : '多接一根发射器，再试一次吧。', 240, 520, 15, C.muted);
      this.button(p, 'play-again', '再放一次学', 90, 586, 300, 45, () => this.newRun(), C.orange);
    }
    p.end();
  }
  drawFloating() {
    const p = this.floating; p.begin();
    if (this.drag?.active) {
      const drag = this.drag, item = this.inventory.get(drag.id)!;
      const { x, y, cell, target, result } = this.dragVisual();
      const parts = this.inventory.movingIds(item).map(id => {
        const part = this.inventory.get(id)!;
        return { ...part, place: { area: 'board' as const,
          x: item.place.area === 'board' && part.place.area === 'board' ? part.place.x - item.place.x : 0,
          y: item.place.area === 'board' && part.place.area === 'board' ? part.place.y - item.place.y : 0 } };
      });
      if (target?.area === 'stash') p.ellipse(x + DEFS[item.kind].w * cell / 2, y + cell - 1, DEFS[item.kind].w * cell * 0.42, 3, '#293b3520', C.ink, 0);
      if (target?.area === 'stash' && result?.ok) {
        const r = this.stashRect(target.slot); shopItemArt(p, item.kind, item.level, r.x + 6, r.y + 5, r.w - 12, r.h - 18);
        if (!result.merged) this.levelStars(p, item, r.x + r.w / 2, r.y + r.h - 8, 4);
      } else assemblyArt(p, this.inventory, parts, x, y, cell);
      if (target) {
        const rects = target.area === 'stash' ? [this.stashRect(target.slot)] : this.inventory.footprint(item, target).map(part => this.itemRect(part));
        const left = Math.max(this.board.x, Math.min(...rects.map(r => r.x))), top = Math.max(this.board.y, Math.min(...rects.map(r => r.y)));
        const right = Math.min(this.board.x + COLS * 56, Math.max(...rects.map(r => r.x + r.w))), bottom = Math.min(this.board.y + ROWS * 56, Math.max(...rects.map(r => r.y + r.h)));
        const rect = target.area === 'stash' ? rects[0] : { x: left, y: top, w: right - left, h: bottom - top };
        if (rect.w > 8 && rect.h > 8) {
          p.corners(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, result?.ok ? C.target : '#e26f62');
          if (result?.merged) {
            if (target.area === 'stash') this.levelStars(p, { ...item, level: item.level + 1 }, rect.x + rect.w / 2, rect.y + rect.h - 8, 4);
          } else if (!result?.ok) {
            const cx = rect.x + rect.w - 9, cy = rect.y + 10;
            p.ellipse(cx, cy, 8, 8, C.white, '#ad534a', 1.5);
            p.line([[cx - 3, cy - 3], [cx + 3, cy + 3]], '#ad534a', 2); p.line([[cx - 3, cy + 3], [cx + 3, cy - 3]], '#ad534a', 2);
          }
        }
      }
    }
    if (this.returning) {
      const r = this.returning, t = Math.min(1, (this.clock - r.start) / 0.32), ease = 1 - Math.pow(1 - t, 3);
      assemblyArt(p, this.inventory, r.parts, r.x + (r.toX - r.x) * ease, r.y + (r.toY - r.y) * ease, r.fromCell + (r.cell - r.fromCell) * ease);
    }
    if (this.placementEffect && this.phase === 'prepare' && !this.modal) {
      const effect = this.placementEffect, t = (this.clock - effect.start) / 0.6;
      if (t < 1) {
        const r = this.itemRect({ ...effect.item, place: effect.place });
        const board = effect.place.area === 'board', kind = effect.item.kind;
        const cx = board && kind === 'stock' ? r.x + r.w - 4 : r.x + r.w / 2;
        const cy = board && kind === 'scope' ? r.y + r.h + 5 : board && ['grip', 'magazine', 'underbarrel'].includes(kind) ? r.y - 11 : r.y + r.h / 2;
        p.smoke(cx, cy, t, effect.merged ? 1.1 : 0.85);
      } else this.placementEffect = null;
    }
    if (this.toast && this.clock < this.toastUntil && !this.drag?.active) {
      p.surface('toast', 30, 118, 420, 36, C.chalk); p.text('toast', this.toast, 240, 136, 13, '#fff6d9', 'center', 408);
    }
    if (this.focus >= 0) { const b = this.buttons.filter(b => b.enabled)[this.focus]; if (b) p.box(b.x - 4, b.y - 4, b.w + 8, b.h + 8, '#ffffff00', 12, '#f9ca69', 3); }
    p.end();
  }
  drawActors() {
    const p = this.actors; p.begin(); const prep = this.phase === 'prepare';
    if (prep) {
      student(p, 89, 204, 48, this.clock * 2);
      this.drawEquipped(p, 102, 204, 12);
      student(p, 390, 205, 41, this.clock * 2 + 1, 0);
    } else {
      const battle = this.battle;
      student(p, 72, 339, 70, this.clock * 3);
      const recoil = (battle?.recoil || 0) * 5;
      this.drawEquipped(p, 95 - recoil, 342, 16);
      p.surface('health-track', 30, 290, 88, 9); p.surface('health-fill', 31, 291, Math.max(1, 86 * (battle?.hp ?? this.hp) / this.maxHp), 7);
      p.text('hp', `${Math.ceil(battle?.hp ?? this.hp)}`, 74, 277, 13, C.ink, 'center', 100, true);
      if (battle) {
        for (const enemy of [...battle.enemies].sort((a, b) => a.y - b.y)) {
          if (enemy.x > 444) continue;
          student(p, enemy.x, 133 + enemy.y, enemy.rank === 'boss' ? 82 : enemy.rank === 'elite' ? 63 : 50, battle.turn === 'enemies' ? this.clock * 9 + enemy.id : enemy.id, enemy.kind, enemy.hit > 0);
          if (enemy.rank !== 'normal') p.text(`enemy-rank-${enemy.id}`, enemy.rank === 'boss' ? 'BOSS' : '精英', enemy.x, 133 + enemy.y - 64, 12, enemy.rank === 'boss' ? '#a94f40' : '#8b6a32', 'center', 75, true);
          if (enemy.hp < enemy.max) { p.surface('health-track', enemy.x - 22, 133 + enemy.y - 35, 44, 5); p.surface('health-fill', enemy.x - 22, 133 + enemy.y - 35, Math.max(1, 44 * enemy.hp / enemy.max), 5); }
        }
        for (const shot of battle.shots) {
          if (shot.kind !== 'barrel') itemArt(p, shot.kind, shot.x - 9, 133 + shot.y - 9, 18, shot.level);
          else { p.line([[shot.x - 11, 133 + shot.y], [shot.x, 133 + shot.y]], '#f7d17e', 5); p.ellipse(shot.x, 133 + shot.y, 4, 3, '#fff7c0', C.ink, 0); }
        }
        battle.effects.forEach((effect, i) => {
          if (effect.kind === 'burst') { const r = (0.5 - effect.life) * 150 + 10; p.ellipse(effect.x, 133 + effect.y, r, r * 0.65, '#f6dc9a44', '#e4b76f', 3); }
          else p.text(`damage-${i}`, effect.text, Math.max(55, Math.min(418, effect.x)), 133 + effect.y, effect.text[0] === '!' ? 21 : 17, effect.kind === 'coin' ? '#6a874f' : '#9c542e', 'center', 90, true);
        });
        p.text('progress', `${battle.defeated} / ${battle.total}`, 404, 149, 13, '#61755f', 'center', 75);
        p.text('turn', battle.turnLabel, 240, 423, 14, battle.turn === 'enemies' ? '#a05b45' : C.chalk, 'center', 330, true);
        p.surface('health-track', 32, 443, 416, 5); p.surface('health-fill', 32, 443, Math.max(1, 416 * battle.defeated / battle.total), 5);
      }
    }
    p.end();
  }
  drawEquipped(p: Painter, x: number, y: number, cell: number) {
    const grip = this.inventory.items.find(i => i.kind === 'grip' && i.place.area === 'board');
    if (grip?.place.area === 'board') assemblyArt(p, this.inventory, this.inventory.connected(grip), x - grip.place.x * cell, y - grip.place.y * cell, cell);
  }
  update(dt: number) {
    this.clock += Math.min(dt, 0.1);
    if (this.placementEffect && this.phase === 'prepare' && !this.modal) this.render();
    if (this.returning && this.clock - this.returning.start >= 0.32) { this.returning = null; this.render(); }
    if (this.phase === 'battle' && !this.modal && this.battle) {
      const count = this.battle.shots.length;
      const ticks = this.speed === 2 ? 2 : 1;
      for (let i = 0; i < ticks; i++) this.battle.step(dt);
      if (this.battle.shots.length > count) this.play('pop');
      if (this.battle.state !== 'running') this.finishBattle();
    }
    this.drawActors(); this.drawFloating();
  }
}
