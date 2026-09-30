import { Stats } from './Inventory';
export interface Enemy { id: number; x: number; y: number; hp: number; max: number; speed: number; kind: number; hit: number; attack: number }
export interface Shot { x: number; y: number; target: number; damage: number; crit: boolean }
export interface Effect { x: number; y: number; text: string; life: number; kind: 'hit' | 'burst' | 'coin' }
export class Battle {
  enemies: Enemy[] = []; shots: Shot[] = []; effects: Effect[] = [];
  hp: number; maxHp: number; elapsed = 0; spawned = 0; defeated = 0; coins = 0;
  state: 'running' | 'won' | 'lost' = 'running';
  spawnTimer = 0.8; fireTimer = 0.2; grenadeTimer = 2.4; id = 0; recoil = 0;
  total: number; seed: number;
  constructor(public wave: number, public stats: Stats, hp = 1298, maxHp = 1298, public damageBonus = 1) {
    this.hp = hp; this.maxHp = maxHp; this.total = 6 + wave * 2; this.seed = 901 + wave;
  }
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  hurt(e: Enemy, damage: number, crit = false) {
    if (e.hp <= 0) return;
    e.hp -= damage; e.hit = 0.14;
    this.effects.push({ x: e.x, y: e.y - 27, text: `${crit ? '!' : ''}${Math.round(damage)}`, life: 0.7, kind: 'hit' });
    if (e.hp <= 0) {
      this.defeated++; this.coins += 3;
      this.effects.push({ x: e.x, y: e.y, text: '+3', life: 0.8, kind: 'coin' });
    }
  }
  step(dt: number) {
    if (this.state !== 'running') return;
    dt = Math.min(dt, 0.05); this.elapsed += dt; this.recoil = Math.max(0, this.recoil - dt * 7);
    this.spawnTimer -= dt; this.fireTimer -= dt; this.grenadeTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawned < this.total) {
      const kind = this.wave % 5 === 0 && this.spawned === this.total - 1 ? 3 : this.spawned % 3;
      const hp = (130 + this.wave * 55) * (kind === 3 ? 10 : kind === 2 ? 1.7 : 1);
      this.enemies.push({ id: this.id++, x: 437, y: 185 + this.random() * 70, hp, max: hp, speed: 22 + this.wave * 2 + kind * 4, kind, hit: 0, attack: 0 });
      this.spawned++; this.spawnTimer = Math.max(0.45, 1.0 - this.wave * 0.025);
    }
    for (const enemy of this.enemies) {
      enemy.hit = Math.max(0, enemy.hit - dt); enemy.attack -= dt;
      if (enemy.hp <= 0) continue;
      if (enemy.x > 102) enemy.x -= enemy.speed * dt;
      else if (enemy.attack <= 0) { this.hp -= 24 + this.wave * 6 + enemy.kind * 8; enemy.attack = 0.75; }
    }
    const living = this.enemies.filter(e => e.hp > 0).sort((a, b) => a.x - b.x);
    if (this.fireTimer <= 0 && living.length && this.stats.barrels > 0) {
      this.fireTimer = 0.36; this.recoil = 1;
      for (let i = 0; i < this.stats.barrels; i++) {
        const enemy = living[i % living.length];
        const crit = this.random() * 100 < this.stats.crit;
        const hit = this.random() * 100 < this.stats.accuracy;
        this.shots.push({ x: 117, y: 197 - i * 8, target: enemy.id, damage: hit ? 651 / 4 * this.damageBonus * (crit ? this.stats.critDamage / 100 : 1) : 0, crit });
      }
    }
    for (const shot of this.shots) {
      const target = this.enemies.find(e => e.id === shot.target);
      if (!target || target.hp <= 0) { shot.x = 600; continue; }
      const dx = target.x - shot.x, dy = target.y - shot.y, dist = Math.hypot(dx, dy), step = 520 * dt;
      if (dist <= step) {
        if (shot.damage) { this.hurt(target, shot.damage, shot.crit); if (this.stats.bounce) { const next = living.find(e => e.id !== target.id && Math.abs(e.x - target.x) < 100); if (next) this.hurt(next, this.stats.bounce); } }
        else this.effects.push({ x: target.x, y: target.y - 20, text: '闪避', life: 0.6, kind: 'hit' });
        shot.x = 600;
      } else { shot.x += dx / dist * step; shot.y += dy / dist * step; }
    }
    if (this.grenadeTimer <= 0 && living.length && this.stats.grenades > 0) {
      this.grenadeTimer = 2.4;
      const target = living[0];
      this.effects.push({ x: target.x, y: target.y, text: '', life: 0.5, kind: 'burst' });
      for (const enemy of living) if (Math.hypot(enemy.x - target.x, enemy.y - target.y) < 110) this.hurt(enemy, 188 * this.stats.grenades * this.damageBonus);
    }
    this.shots = this.shots.filter(s => s.x < 550);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    for (const effect of this.effects) { effect.life -= dt; if (effect.kind !== 'burst') effect.y -= 25 * dt; }
    this.effects = this.effects.filter(e => e.life > 0);
    if (this.hp <= 0) { this.hp = 0; this.state = 'lost'; }
    else if (this.spawned === this.total && !this.enemies.length) this.state = 'won';
  }
}
