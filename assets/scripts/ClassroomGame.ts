import { _decorator, Component, input, Input, EventMouse, EventTouch, EventKeyboard, KeyCode, UITransform, Vec3, view, ResolutionPolicy, sys, AudioSource, AudioClip, resources, game, Game } from 'cc';
import { C, Painter, itemArt, student } from './Painter';
import { DEFS, Inventory, Item, Kind, Offer, Place, offersFor } from './core/Inventory';
import { Battle } from './core/Battle';
const { ccclass } = _decorator;
type Phase = 'prepare' | 'battle' | 'reward' | 'victory' | 'defeat';
interface Button { x: number; y: number; w: number; h: number; action: () => void; label: string; enabled: boolean }
interface Drag { id: number; source: Place; shop: number; startX: number; startY: number; x: number; y: number; offX: number; offY: number; active: boolean }
const SAVE = 'class-gun-hero-v1';

@ccclass('ClassroomGame')
export class ClassroomGame extends Component {
  inventory = new Inventory(); coins = 70; wave = 0; refreshes = 0;
  hp = 1298; maxHp = 1298; damageBonus = 1; offers = offersFor(0, 0);
  phase: Phase = 'prepare'; battle: Battle | null = null; speed = 1;
  back!: Painter; actors!: Painter; overlay!: Painter; floating!: Painter;
  buttons: Button[] = []; drag: Drag | null = null; selected: Item | null = null;
  modal: 'help' | 'pause' | 'item' | 'restart' | null = null;
  focus = -1; clock = 0; toast = ''; toastUntil = 0; feedback = ''; sound = true;
  lastDown = -1; lastDownX = 0; lastDownY = 0;
  soundSource!: AudioSource; clips = new Map<string, AudioClip>(); lastShots = 0;
  board = { x: 72, y: 365, cell: 56 }; lastUiRevision = -1;
  onLoad() {
    view.setDesignResolutionSize(480, 960, ResolutionPolicy.SHOW_ALL);
    view.resizeWithBrowserSize(true);
    this.back = new Painter(this.node, 'Notebook'); this.actors = new Painter(this.node, 'Students');
    this.overlay = new Painter(this.node, 'Dialogs'); this.floating = new Painter(this.node, 'Dragging');
    this.soundSource = this.node.addComponent(AudioSource);
    for (const name of ['click', 'snap', 'pop', 'win']) resources.load(`audio/${name}`, AudioClip, (err, clip) => { if (!err) this.clips.set(name, clip); });
    this.restore();
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
      this.say('已接着上次的书包继续');
    } catch { this.inventory = new Inventory(); }
  }
  newRun() { this.inventory = new Inventory(); this.coins = 70; this.wave = this.refreshes = 0; this.hp = this.maxHp = 1298; this.damageBonus = 1; this.offers = offersFor(0, 0); this.phase = 'prepare'; this.battle = null; this.modal = null; this.selected = null; this.save(); this.render(); }
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
  itemRect(item: Item) {
    const d = DEFS[item.kind];
    if (item.place.area === 'board') return { x: this.board.x + item.place.x * this.board.cell, y: this.board.y + item.place.y * this.board.cell, w: d.w * this.board.cell, h: d.h * this.board.cell };
    return { x: 53 + (item.place.slot % 5) * 76, y: 690 + Math.floor(item.place.slot / 5) * 46, w: 68, h: 39 };
  }
  down({ x, y }: { x: number; y: number }) {
    if (this.drag) return;
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
      const offer = this.offers[index]; if (offer.sold) { this.say('本轮已买走，刷新后会有新文具'); return; }
      if (this.coins < offer.price) { this.say(`零花钱不足，还差 ${offer.price - this.coins}`); this.selected = { id: -1, kind: offer.kind, level: offer.level, place: { area: 'stash', slot: -1 } }; this.modal = 'item'; this.render(); return; }
      const draft = this.inventory.add(offer.kind, { area: 'stash', slot: -1 }, offer.level);
      this.drag = { id: draft.id, source: { ...draft.place }, shop: index, startX: x, startY: y, x, y, offX: DEFS[draft.kind].w / 2, offY: 0.5, active: false };
      return;
    }
  }
  move({ x, y }: { x: number; y: number }) {
    if (!this.drag) return;
    this.drag.x = x; this.drag.y = y;
    if (!this.drag.active && Math.hypot(x - this.drag.startX, y - this.drag.startY) > 7) { this.drag.active = true; this.render(); }
    if (this.drag.active) this.render();
  }
  dragTarget(): Place | null {
    const d = this.drag; if (!d) return null;
    if (d.y >= 679 && d.y < 781 && d.x >= 49 && d.x < 431) return { area: 'stash', slot: Math.min(9, Math.floor((d.y - 687) / 46) * 5 + Math.floor((d.x - 49) / 76)) };
    if (d.y < 670 && d.y > 330) return { area: 'board', x: Math.round((d.x - this.board.x) / this.board.cell - d.offX), y: Math.round((d.y - this.board.y) / this.board.cell - d.offY) };
    return null;
  }
  removeDraft() { if (this.drag && this.drag.shop >= 0) this.inventory.items = this.inventory.items.filter(i => i.id !== this.drag!.id); }
  up(p: { x: number; y: number }) {
    const d = this.drag; if (!d) return;
    const item = this.inventory.get(d.id)!;
    if (!d.active) { this.removeDraft(); this.selected = { ...item }; this.modal = 'item'; this.drag = null; this.render(); return; }
    d.x = p.x; d.y = p.y; const target = this.dragTarget();
    const result = target ? this.inventory.move(d.id, target) : { ok: false, reason: '已放回原位' };
    if (result.ok) {
      if (d.shop >= 0) { this.coins -= this.offers[d.shop].price; this.offers[d.shop].sold = true; }
      this.say(result.replaced ? '新枪托装好了，旧件已放入暂存区' : target!.area === 'stash' ? '暂存物品不会参与战斗' : '咔哒！安装完成');
      this.play('snap'); this.save();
    } else { this.removeDraft(); this.say(result.reason); }
    this.drag = null; this.render();
  }
  cancelDrag() { this.removeDraft(); this.drag = null; if (this.back) this.render(); }
  buy(index: number) {
    const offer = this.offers[index]; if (offer.sold) return;
    if (this.coins < offer.price) { this.say('零花钱不够，先去操场打一波'); return; }
    const slot = this.inventory.freeSlot(); if (slot === -1) { this.say('暂存区已满，请先整理书包'); return; }
    const item = this.inventory.add(offer.kind, { area: 'stash', slot }, offer.level);
    this.coins -= offer.price; offer.sold = true; this.inventory.autoPlace(item);
    this.modal = null; this.say(item.place.area === 'board' ? '文具已安装，属性立即生效' : '已放入暂存区，拖到绿色接口安装'); this.play('snap'); this.save(); this.render();
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
    this.say(`第 ${this.wave} 波完成 · 零花钱 +${earned}`); this.render();
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
    p.box(x, y + 4, w, h, C.ink, 9, C.ink, 0); p.box(x, y, w, h, enabled ? color : '#d0d2bf', 9, C.ink, 2.3);
    p.text(`button-${key}`, text, x + w / 2, y + h / 2, 17, enabled ? C.ink : C.muted, 'center', w - 8, true);
    this.buttons.push({ x, y, w, h, action, label: text, enabled });
  }
  render() {
    this.buttons = []; const p = this.back; p.begin();
    const prep = this.phase === 'prepare'; this.board = prep ? { x: 72, y: 365, cell: 56 } : { x: 72, y: 572, cell: 56 };
    p.box(0, 0, 480, 960, C.paper, 0, C.paper, 0);
    for (let y = 115; y < 960; y += 24) p.line([[16, y], [464, y]], '#e6e5d1', 1);
    p.line([[32, 110], [32, 952]], '#e4baa5', 1);
    p.box(0, 0, 480, 106, C.chalk, 0, C.chalk, 0);
    p.line([[21, 99], [459, 99]], '#719481', 1);
    p.text('subhead', 'AFTER SCHOOL CLUB', 24, 19, 11, '#b9d1bd', 'left', 220);
    p.text('title', '下课别跑', 23, 52, 33, C.white, 'left', 220, true);
    p.text('chapter', '一年三班  /  放学后的操场', 25, 83, 12, '#d7dbc5', 'left', 260);
    p.box(298, 25, 98, 34, '#355f4c', 17, '#72907b', 1);
    p.ellipse(316, 42, 9, 9, '#e8bf6c', '#e8bf6c', 0); p.text('coins', this.coins, 346, 42, 18, '#f7df94', 'center', 56, true);
    this.button(p, 'pause', 'Ⅱ', 412, 27, 43, 32, () => { this.modal = 'pause'; this.render(); }, '#a1bfa5');
    p.text('wave', `${String(this.wave).padStart(2, '0')} / 15 波`, 388, 82, 13, '#d7dbc5', 'right', 115);
    const arenaY = 120, arenaH = prep ? 128 : 345;
    this.corridor(p, arenaY, arenaH, prep);
    this.stats(p, prep ? 278 : 491);
    p.text('board-name', '我的武器书包', 54, prep ? 330 : 537, 18, C.ink, 'left', 240, true);
    p.text('board-count', '6 × 5', 425, prep ? 330 : 537, 13, C.muted, 'right', 90);
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
    const { x, y, cell } = this.board, prep = this.phase === 'prepare';
    p.box(x - 17, y - 12 + 6, 370, 303, '#a7b29d', 13, C.ink, 0);
    p.box(x - 17, y - 12, 370, 303, '#faf7e9', 13, C.ink, 2.3);
    for (let i = 0; i < 5; i++) { p.ellipse(x - 15, y + 24 + i * 56, 4, 9, '#617a68', '#617a68', 0); p.line([[x - 23, y + 22 + i * 56], [x - 12, y + 22 + i * 56]], '#bec7ae', 3); }
    const held = this.drag?.active ? this.inventory.get(this.drag.id) : undefined;
    const hidden = held ? this.inventory.movingIds(held) : [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
      const good = held && this.inventory.validate(held, { area: 'board', x: col, y: row }).ok;
      const fill = held ? good ? '#b2d5a2' : '#e9c8b9' : (row + col) % 2 ? '#e7ebd8' : '#e1e7d2';
      p.box(x + col * cell + 3, y + row * cell + 3, cell - 6, cell - 6, fill, 7, fill, 0);
      if (good) p.ellipse(x + col * cell + 28, y + row * cell + 28, 3, 3, '#688d5b', '#688d5b', 0);
    }
    const items = this.inventory.items.filter(i => i.place.area === 'board' && !hidden.includes(i.id));
    for (const item of items) {
      if (item.place.area !== 'board') continue;
      // Visible elastic bridges show stacked barrels as one assembled weapon.
      if (item.kind === 'barrel') {
        const pos = item.place;
        if (items.some(i => i.kind === 'barrel' && i.place.area === 'board' && i.place.x === pos.x && i.place.y === pos.y + 1)) {
          for (const off of [26, 128]) { p.line([[x + pos.x * cell + off, y + pos.y * cell + 35], [x + pos.x * cell + off - 9, y + (pos.y + 1) * cell + 18]], C.ink, 6); p.line([[x + pos.x * cell + off, y + pos.y * cell + 35], [x + pos.x * cell + off - 9, y + (pos.y + 1) * cell + 18]], '#97bcb0', 3); }
        }
      }
      itemArt(p, item.kind, x + item.place.x * cell, y + item.place.y * cell, cell, item.level);
    }
    if (prep && held) { const target = this.dragTarget(); if (target?.area === 'board') { const ok = this.inventory.validate(held, target).ok; p.box(x + target.x * cell + 1, y + target.y * cell + 1, DEFS[held.kind].w * cell - 2, DEFS[held.kind].h * cell - 2, '#ffffff18', 6, ok ? '#527c42' : '#b85743', 3); } }
  }
  preparation(p: Painter) {
    p.text('stash-title', '课桌暂存', 54, 673, 12, C.muted, 'left', 130);
    p.text('drag-tip', '拖动握把移动整枪 · 点击物品查看', 426, 673, 11, C.muted, 'right', 285);
    const held = this.drag?.active ? this.drag.id : -1;
    for (let slot = 0; slot < 10; slot++) {
      const x = 53 + (slot % 5) * 76, y = 690 + Math.floor(slot / 5) * 46;
      p.box(x, y, 68, 39, '#e1e4cd', 6, '#a5b09a', 1.3);
      const item = this.inventory.items.find(i => i.place.area === 'stash' && i.place.slot === slot && i.id !== held);
      if (item) { const cell = Math.min(31, 58 / DEFS[item.kind].w); itemArt(p, item.kind, x + (68 - cell * DEFS[item.kind].w) / 2, y + (39 - cell) / 2, cell, item.level); }
      else p.line([[x + 31, y + 19], [x + 37, y + 19]], '#b0bca5', 1.5);
    }
    p.text('shop-name', '小卖部', 54, 786, 12, C.muted, 'left', 100);
    p.text('shop-tip', '直接拖进书包，落下才扣钱', 426, 786, 11, C.muted, 'right', 220);
    this.offers.forEach((offer, i) => {
      const x = 52 + i * 128;
      p.box(x, 800, 120, 84, offer.sold ? '#dfe2cf' : C.white, 8, offer.sold ? '#bdc3aa' : '#8b9f88', 1.5);
      if (offer.sold) { p.text(`sold-${i}`, '已买走', x + 60, 833, 17, '#849b7c', 'center', 116, true); p.text(`sold-note-${i}`, '刷新补货', x + 60, 864, 11, C.muted); return; }
      const cell = Math.min(36, 92 / DEFS[offer.kind].w);
      itemArt(p, offer.kind, x + (120 - cell * DEFS[offer.kind].w) / 2, 807, cell, offer.level);
      p.text(`shop-item-${i}`, offer.kind === 'stock' && offer.level > 1 ? '木尺枪托' : DEFS[offer.kind].name, x + 60, 850, 12, C.ink, 'center', 115);
      p.text(`shop-price-${i}`, `${offer.price} 零花钱${offer.level > 1 ? '  ★' + offer.level : ''}`, x + 60, 869, 12, this.coins >= offer.price ? '#997141' : '#b47b6a', 'center', 118, true);
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
      p.box(47, 258, 386, 409, C.paper, 18, C.ink, 3);
      p.text('pause-small', '课 间 休 息', 240, 297, 13, C.muted);
      p.text('pause-title', '喘口气，再出发。', 240, 343, 26, C.ink, 'center', 366, true);
      this.button(p, 'resume', '继续游戏', 87, 387, 306, 43, () => { this.modal = null; this.render(); }, C.mint);
      this.button(p, 'guide', '武器拼装说明', 87, 444, 306, 43, () => { this.modal = 'help'; this.render(); }, '#e5dfca');
      this.button(p, 'sound', `声音：${this.sound ? '开' : '关'}`, 87, 501, 144, 39, () => { this.sound = !this.sound; this.save(); this.render(); }, '#e5dfca');
      this.button(p, 'restart', '重新开始', 249, 501, 144, 39, () => { this.modal = 'restart'; this.render(); }, '#e5dfca');
      p.text('pause-tip', '空格：开战 / 暂停    R：刷新商店', 240, 584, 13, C.muted);
      p.text('pause-tip2', '1 / 2 / 3：购买并安装对应商品', 240, 612, 13, C.muted);
    } else if (this.modal === 'help') {
      p.box(30, 156, 420, 666, C.paper, 18, C.ink, 3);
      p.text('help-title', '把文具，拼成战斗力。', 240, 196, 24, C.ink, 'center', 410, true);
      itemArt(p, 'stock', 72, 308, 46); itemArt(p, 'barrel', 164, 308, 46); itemArt(p, 'grip', 164, 354, 46); itemArt(p, 'barrel', 164, 262, 46); itemArt(p, 'scope', 164, 216, 46);
      const notes = ['01  握把是核心，拖它移动整个武器。', '02  发射器可叠在另一根发射器上方。', '03  枪托接左侧，瞄具接最上方。', '04  纸团、牛奶可以独立放入空格。', '05  绿色表示接口可用，红色不可放。', '06  暂存区的文具不会参与战斗。'];
      notes.forEach((t, i) => p.text(`help-${i}`, t, 58, 407 + i * 43, 16, C.ink, 'left', 375));
      p.text('help-extra', '点击商品可购买并自动安装，也可以直接拖拽。', 240, 692, 12, C.muted);
      this.button(p, 'help-close', '知道了，去拼装', 91, 743, 298, 42, () => { this.modal = null; this.render(); });
    } else if (this.modal === 'restart') {
      p.box(47, 314, 386, 285, C.paper, 18, C.ink, 3); p.text('restart-title', '重新放一次学？', 240, 364, 25, C.ink, 'center', 360, true);
      p.text('restart-note', '这次的书包、零花钱和波次会重置。', 240, 410, 15, C.muted);
      this.button(p, 'cancel-restart', '继续这一局', 76, 477, 155, 46, () => { this.modal = 'pause'; this.render(); }, '#dce3cd');
      this.button(p, 'confirm-restart', '重新开始', 249, 477, 155, 46, () => this.newRun(), C.orange);
    } else if (this.modal === 'item' && this.selected) {
      const item = this.selected, def = DEFS[item.kind];
      p.box(40, 271, 400, 372, C.paper, 17, C.ink, 3);
      p.text('item-title', item.kind === 'stock' && item.level > 1 ? '木尺枪托' : def.name, 240, 309, 25, C.ink, 'center', 380, true);
      itemArt(p, item.kind, 240 - def.w * 46 / 2, 349, 46, item.level);
      p.text('item-level', `等级 ${item.level}  ·  占用 ${def.w} × ${def.h} 格`, 240, 423, 14, C.muted);
      const desc = item.kind === 'stock' && item.level > 1 ? '替换原枪托 · 命中提升至 94%' : def.subtitle;
      p.text('item-desc', desc, 240, 457, 14, C.ink, 'center', 375);
      const offerIndex = this.offers.findIndex(o => o.kind === item.kind && o.level === item.level && !o.sold);
      const exists = this.inventory.get(item.id);
      if (exists) {
        if (exists.place.area === 'stash') this.button(p, 'auto-install', '寻找接口并安装', 80, 500, 320, 42, () => { const r = this.inventory.autoPlace(exists); this.say(r.reason); this.modal = null; this.save(); this.render(); }, C.mint);
        else this.button(p, 'unequip', '拆下放入暂存区', 80, 500, 320, 42, () => { const slot = this.inventory.freeSlot(); if (slot < 0) { this.say('暂存区已满'); return; } this.inventory.move(exists.id, { area: 'stash', slot }); this.modal = null; this.save(); this.render(); }, '#dce2ca');
      } else if (offerIndex >= 0) this.button(p, 'buy', `购买并安装 · ${this.offers[offerIndex].price}`, 80, 500, 320, 42, () => this.buy(offerIndex), C.orange, this.coins >= this.offers[offerIndex].price);
      this.button(p, 'item-close', '返回书包', 80, 563, 320, 38, () => { this.modal = null; this.render(); }, '#dce2ca');
    } else if (this.phase === 'reward') {
      p.text('reward-small', '放学小奖励', 240, 250, 17, '#b2c8af'); p.text('reward-title', '今天，又厉害了一点。', 240, 293, 27, C.white, 'center', 450, true);
      const rewards = [['手工达人', '火力 +15%', 'barrel'], ['运动健将', '体力上限 +200', 'medkit'], ['零花钱自由', '零花钱 +40', 'grenade']] as const;
      rewards.forEach(([name, note, kind], i) => {
        const x = 25 + i * 148; p.box(x, 362, 134, 243, C.paper, 12, '#89a385', 2);
        const c = kind === 'barrel' ? 32 : 52; itemArt(p, kind, x + (134 - DEFS[kind].w * c) / 2, 389, c);
        p.text(`reward-name-${i}`, name, x + 67, 475, 18, C.ink, 'center', 130, true); p.text(`reward-note-${i}`, note, x + 67, 508, 13, C.muted, 'center', 132);
        this.button(p, `reward-${i}`, '就选这个', x + 9, 550, 116, 34, () => this.reward(i), C.mint);
      });
      p.text('reward-hint', '选择一项，带着新本领继续下一波', 240, 658, 14, '#c4d2bc');
    } else {
      const win = this.phase === 'victory'; p.box(39, 245, 402, 460, C.paper, 18, C.ink, 3);
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
      const x = drag.x - drag.offX * 56, y = drag.y - drag.offY * 56;
      for (const id of this.inventory.movingIds(item)) {
        const part = this.inventory.get(id)!;
        const dx = item.place.area === 'board' && part.place.area === 'board' ? (part.place.x - item.place.x) * 56 : 0;
        const dy = item.place.area === 'board' && part.place.area === 'board' ? (part.place.y - item.place.y) * 56 : 0;
        itemArt(p, part.kind, x + dx, y + dy - 3, 56, part.level);
      }
      const target = this.dragTarget(), result = target ? this.inventory.validate(item, target) : null;
      const note = result ? result.ok ? target!.area === 'stash' ? '松手暂存' : '松手安装' : result.reason : '拖到绿色接口或暂存区';
      p.box(58, 651, 366, 29, '#fffaf0ed', 14, result?.ok ? '#69945b' : '#aa8069', 1);
      p.text('drag-result', note, 240, 665, 12, C.ink, 'center', 357, true);
    }
    if (this.toast && this.clock < this.toastUntil && !this.drag?.active) {
      p.box(30, 118, 420, 36, '#244d43ed', 18, '#abc4a7', 1); p.text('toast', this.toast, 240, 136, 13, '#fff6d9', 'center', 408);
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
      p.box(30, 290, 88, 9, '#83987c', 4, C.ink, 1); p.box(31, 291, Math.max(1, 86 * (battle?.hp ?? this.hp) / this.maxHp), 7, '#b1d68e', 3, C.ink, 0);
      p.text('hp', `${Math.ceil(battle?.hp ?? this.hp)}`, 74, 277, 13, C.ink, 'center', 100, true);
      if (battle) {
        for (const enemy of [...battle.enemies].sort((a, b) => a.y - b.y)) {
          if (enemy.x > 444) continue;
          student(p, enemy.x, 133 + enemy.y, enemy.kind === 3 ? 82 : 50, this.clock * 9 + enemy.id, enemy.kind, enemy.hit > 0);
          if (enemy.hp < enemy.max) { p.box(enemy.x - 22, 133 + enemy.y - 35, 44, 5, '#82947f', 2, C.ink, 0); p.box(enemy.x - 22, 133 + enemy.y - 35, Math.max(1, 44 * enemy.hp / enemy.max), 5, C.orange, 2, C.ink, 0); }
        }
        for (const shot of battle.shots) { p.line([[shot.x - 11, 133 + shot.y], [shot.x, 133 + shot.y]], '#f7d17e', 5); p.ellipse(shot.x, 133 + shot.y, 4, 3, '#fff7c0', C.ink, 0); }
        battle.effects.forEach((effect, i) => {
          if (effect.kind === 'burst') { const r = (0.5 - effect.life) * 150 + 10; p.ellipse(effect.x, 133 + effect.y, r, r * 0.65, '#f6dc9a44', '#e4b76f', 3); }
          else p.text(`damage-${i}`, effect.text, Math.max(55, Math.min(418, effect.x)), 133 + effect.y, effect.text[0] === '!' ? 21 : 17, effect.kind === 'coin' ? '#6a874f' : '#9c542e', 'center', 90, true);
        });
        p.text('progress', `${battle.defeated} / ${battle.total}`, 404, 149, 13, '#61755f', 'center', 75);
        p.box(32, 443, 416, 5, '#b6bea4', 3, C.ink, 0); p.box(32, 443, Math.max(1, 416 * battle.defeated / battle.total), 5, '#637f63', 3, C.ink, 0);
      }
    }
    p.end();
  }
  drawEquipped(p: Painter, x: number, y: number, cell: number) {
    const grips = this.inventory.items.filter(i => i.kind === 'grip' && i.place.area === 'board');
    grips.forEach((grip, index) => {
      if (grip.place.area !== 'board') return;
      const base = grip.place;
      for (const part of this.inventory.connected(grip)) {
        if (part.place.area !== 'board') continue;
        itemArt(p, part.kind, x + (part.place.x - base.x) * cell, y + (part.place.y - base.y) * cell - index * 13, cell, part.level);
      }
    });
  }
  update(dt: number) {
    this.clock += Math.min(dt, 0.1);
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
