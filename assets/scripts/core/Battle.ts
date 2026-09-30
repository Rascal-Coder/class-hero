import { Attack, Stats } from './Inventory';
export type Turn = 'tools' | 'shots' | 'enemies';
export interface Enemy {
  id: number; x: number; y: number; hp: number; max: number; speed: number; kind: number; hit: number;
  range: number; rank: 'normal' | 'elite' | 'boss'; skill: string; turns: number;
}
export interface Shot { x: number; y: number; target: number; damage: number; crit: boolean; kind: Attack['kind']; level: number; age: number; duration: number; fromY: number }
export interface Effect { x: number; y: number; text: string; life: number; kind: 'hit' | 'burst' | 'coin' }
export interface ActionEvent { round: number; actor: 'player' | 'enemy'; kind: string; id: number }
export class Battle {
  enemies: Enemy[] = []; shots: Shot[] = []; effects: Effect[] = []; actionLog: ActionEvent[] = [];
  hp: number; maxHp: number; elapsed = 0; spawned = 0; defeated = 0; coins = 0;
  state: 'running' | 'won' | 'lost' = 'running';
  turn: Turn = 'tools'; round = 1; actionTimer = 0.4; recoil = 0;
  total: number; seed: number;
  private queue: Attack[] = []; private actionIndex = 0; private enemyQueue: number[] = []; private enemyIndex = 0;
  private movement: { id: number; from: number; to: number; time: number } | null = null;
  constructor(public wave: number, public stats: Stats, hp = 1298, maxHp = 1298, public damageBonus = 1) {
    this.hp = hp; this.maxHp = maxHp; this.total = 2 + Math.min(4, Math.floor(wave / 2)); this.seed = 901 + wave;
    for (let i = 0; i < this.total; i++) {
      const rank = i === this.total - 1 ? wave % 5 === 0 ? 'boss' : wave >= 3 ? 'elite' : 'normal' : 'normal';
      const kind = rank === 'boss' ? 3 : i % 3;
      const health = (250 + wave * 80) * (rank === 'boss' ? 5 : rank === 'elite' ? 2.2 : kind === 2 ? 0.85 : 1);
      this.enemies.push({ id: i, x: 320 + i * 23, y: 190 + (i % 3) * 25, hp: health, max: health,
        speed: kind === 2 ? 78 : 48, kind, hit: 0, range: kind === 1 ? 190 : kind === 3 ? 135 : 110,
        rank, skill: rank === 'boss' ? '蓄力重击' : rank === 'elite' ? '双重连击' : ['近身拍击', '远程投掷', '冲刺突袭'][kind], turns: 0 });
    }
    this.spawned = this.total; this.beginRound();
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  get turnLabel() { return `第 ${this.round} 回合 · ${this.turn === 'tools' ? '道具先手' : this.turn === 'shots' ? '逐管射击' : '敌方行动'}`; }
  private record(actor: ActionEvent['actor'], kind: string, id: number) {
    this.actionLog.push({ round: this.round, actor, kind, id });
    if (this.actionLog.length > 96) this.actionLog.shift();
  }
  private beginRound() {
    // One action per physical item; upgrading increases damage, never shot count.
    this.queue = [...this.stats.attacks.filter(a => a.kind !== 'barrel'), ...this.stats.attacks.filter(a => a.kind === 'barrel')];
    this.actionIndex = 0; this.turn = this.queue[0]?.kind === 'barrel' ? 'shots' : 'tools';
  }
  hurt(e: Enemy, damage: number, crit = false) {
    if (e.hp <= 0) return;
    e.hp -= damage; e.hit = 0.14;
    this.effects.push({ x: e.x, y: e.y - 27, text: `${crit ? '!' : ''}${Math.round(damage)}`, life: 0.7, kind: 'hit' });
    if (e.hp <= 0) {
      const reward = e.rank === 'boss' ? 15 : e.rank === 'elite' ? 7 : 3;
      this.defeated++; this.coins += reward;
      this.effects.push({ x: e.x, y: e.y, text: `+${reward}`, life: 0.8, kind: 'coin' });
    }
  }
  private fire(attack: Attack) {
    const enemy = [...this.enemies].filter(e => e.hp > 0).sort((a, b) => a.x - b.x || a.id - b.id)[0];
    if (!enemy) return;
    const bullet = attack.kind === 'barrel';
    const crit = bullet && this.random() * 100 < this.stats.crit;
    const hit = !bullet || this.random() * 100 < this.stats.accuracy;
    const damage = (bullet ? 651 : attack.kind === 'underbarrel' ? 260 : 188) * attack.level * this.damageBonus;
    this.turn = bullet ? 'shots' : 'tools'; this.recoil = bullet ? 1 : 0;
    this.shots.push({ x: 117, y: 197, fromY: 197, target: enemy.id, damage: hit ? damage * (crit ? this.stats.critDamage / 100 : 1) : 0,
      crit, kind: attack.kind, level: attack.level, age: 0, duration: bullet ? Math.max(0.15, (enemy.x - 117) / 620) : 0.55 });
    this.record('player', attack.kind, this.actionIndex); this.actionTimer = 0.28;
  }
  private advanceShots(dt: number) {
    for (const shot of this.shots) {
      const target = this.enemies.find(e => e.id === shot.target && e.hp > 0);
      if (!target) { shot.age = shot.duration; continue; }
      shot.age += dt; const t = Math.min(1, shot.age / shot.duration);
      shot.x = 117 + (target.x - 117) * t;
      shot.y = shot.fromY + (target.y - shot.fromY) * t - (shot.kind === 'barrel' ? 0 : Math.sin(t * Math.PI) * 65);
      if (t < 1) continue;
      if (shot.kind !== 'barrel') {
        this.effects.push({ x: target.x, y: target.y, text: '', life: 0.5, kind: 'burst' });
        for (const enemy of this.enemies) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) < 110) this.hurt(enemy, shot.damage);
      } else if (shot.damage) {
        this.hurt(target, shot.damage, shot.crit);
        const next = this.enemies.find(e => e.hp > 0 && e.id !== target.id && Math.abs(e.x - target.x) < 100);
        if (next && this.stats.bounce) this.hurt(next, this.stats.bounce * this.damageBonus);
      } else this.effects.push({ x: target.x, y: target.y - 20, text: '闪避', life: 0.6, kind: 'hit' });
    }
    this.shots = this.shots.filter(s => s.age < s.duration);
  }
  private enemyAttack(enemy: Enemy) {
    if (enemy.x > enemy.range) return;
    enemy.turns++;
    const multiplier = enemy.rank === 'boss' ? (enemy.turns % 2 === 0 ? 2.5 : 1.5) : enemy.rank === 'elite' ? 2 : 1;
    this.hp = Math.max(0, this.hp - Math.round((24 + this.wave * 6 + enemy.kind * 8) * multiplier));
    this.effects.push({ x: enemy.x, y: enemy.y - 45, text: enemy.skill, life: 0.9, kind: 'hit' });
    this.record('enemy', enemy.skill, enemy.id);
  }
  private advanceTurn(dt: number) {
    if (this.movement) {
      const move = this.movement, enemy = this.enemies.find(e => e.id === move.id);
      move.time += dt;
      if (enemy) enemy.x = move.from + (move.to - move.from) * Math.min(1, move.time / 0.3);
      if (move.time >= 0.3) { if (enemy) this.enemyAttack(enemy); this.movement = null; this.actionTimer = 0.4; }
      return;
    }
    if (this.shots.length || this.actionTimer > 0) return;
    if (this.turn !== 'enemies') {
      if (this.actionIndex < this.queue.length) { this.fire(this.queue[this.actionIndex++]); return; }
      this.turn = 'enemies'; this.enemyQueue = this.enemies.filter(e => e.hp > 0).map(e => e.id); this.enemyIndex = 0; this.actionTimer = 0.35; return;
    }
    const enemyId = this.enemyQueue[this.enemyIndex++];
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (enemy) {
      this.record('enemy', '前进一步', enemy.id);
      this.movement = { id: enemy.id, from: enemy.x, to: Math.min(enemy.x, Math.max(enemy.range, enemy.x - enemy.speed)), time: 0 };
    } else { this.round++; this.beginRound(); this.actionTimer = 0.35; }
  }
  step(dt: number) {
    if (this.state !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05); this.elapsed += dt; this.recoil = Math.max(0, this.recoil - dt * 7);
    this.actionTimer = Math.max(0, this.actionTimer - dt);
    for (const enemy of this.enemies) enemy.hit = Math.max(0, enemy.hit - dt);
    for (const effect of this.effects) { effect.life -= dt; if (effect.kind !== 'burst') effect.y -= 25 * dt; }
    this.effects = this.effects.filter(e => e.life > 0);
    this.advanceShots(dt); this.enemies = this.enemies.filter(e => e.hp > 0);
    if (!this.enemies.length) { this.state = 'won'; this.shots = []; return; }
    this.advanceTurn(dt);
    if (this.hp <= 0) { this.hp = 0; this.state = 'lost'; this.shots = []; }
  }
}
