import type { World } from '../../World';
import type { IEnemy } from './Enemy';
import { TAU, clamp, rand } from '../../../engine/math';
import { TUNING } from '../../balance/tuning';
import { HP } from '../../config';
import { softGlow } from './renderers/helpers';

export type Phase = 'move' | 'sweep' | 'garden' | 'spiral' | 'nova';

/** Egy Lidérc-féle boss hangolható paraméterei (stat + támadó fázisok). */
export interface Boss2Config {
  /** Fix életerő; ha nincs megadva, a TUNING.bossFlowerHp. */
  hp?: number;
  /** Érintés-sebzés fél-szívben (×HP.half a kijelzett pont); alap 1.5 = 750 pont. */
  dmg?: number;
  /** A körben váltakozó támadó fázisok (a 'move' automatikusan közéjük ékelődik). */
  phases?: Exclude<Phase, 'move'>[];
}

/** A Lidérc-féle bossok teljes szín-palettája (a rajz minden színe innen jön). */
export interface Boss2Palette {
  aura: string;         // külső szellem-aura (rgba, áttetsző)
  orb: string;          // keringő varázsgömbök
  glow: string;         // közös ragyogás (gömb / szem / lézer)
  robeTop: string;      // lepel-gradient teteje
  robeMid: string;      // lepel-gradient közepe
  robeBottom: string;   // lepel-gradient alja (rgba 0 alfa → elhalványul)
  robeStroke: string;   // lepel körvonala
  hood: string;         // csuklya-üreg
  skull: string;        // koponya-arc
  jaw: string;          // állkapocs-él
  socket: string;       // szemgödör / fog-vonal
  eye: string;          // izzó szem
  thirdEye: string;     // homlok-harmadik szem
  thirdEyeGlow: string; // a harmadik szem ragyogása
  laserCore: string;    // söprő lézersugár fő színe
  laserHalo: string;    // a lézer külső haloja (rgba)
}

/** Az eredeti „A Lidérc" lila palettája. */
export const DEFAULT_BOSS2_PALETTE: Boss2Palette = {
  aura: 'rgba(150,90,255,0.18)',
  orb: '#c79aff',
  glow: '#9a5bff',
  robeTop: '#3a2a66',
  robeMid: '#221646',
  robeBottom: 'rgba(15,8,32,0)',
  robeStroke: '#0e0820',
  hood: '#0a0618',
  skull: '#d8d0e8',
  jaw: '#b8aecf',
  socket: '#1a0d2e',
  eye: '#b06aff',
  thirdEye: '#ff6ae6',
  thirdEyeGlow: '#ff4ae0',
  laserCore: '#b48aff',
  laserHalo: 'rgba(170,120,255,0.3)',
};

/**
 * Második főellenség — „A Lidérc": kísérteties varázsló, aki az új
 * mechanikákat váltogatja:
 *   sweep  — átsöprő energiasugár (forgó lézer)
 *   garden — méreg-tócsák és ködfelhők gyűrűje maga körül
 *   spiral — pörgő golyó-spirál
 *   nova   — táguló tűzgyűrű égő foltokból
 * A teljes színvilág a `pal` palettából jön, így a variánsok (pl. A lidérc
 * mérge) csak más palettát adnak — a mechanika közös.
 */
export class Boss2 implements IEnemy {
  readonly boss = true;
  r = 44;
  hp: number;
  maxHp: number;
  speed = 72;
  dmg: number; // érintés-sebzés fél-szívben (×HP.half a kijelzett pont)
  col: string;
  col2 = '#160a28';
  readonly score: number;

  flash = 0;
  protected readonly pal: Boss2Palette;
  private readonly phases: Exclude<Phase, 'move'>[];
  protected wob = 0;
  private bob = 0;
  private phase: Phase = 'move';
  private phaseT = 1.6;
  private cycle = 0;
  private spiralAng = 0;
  private shootCd = 0;
  private laserAng = 0;
  private laserLen = 0;
  private laserOn = false;
  private entering = true;

  constructor(public x: number, public y: number, floor: number, color = '#7b54e0', pal: Boss2Palette = DEFAULT_BOSS2_PALETTE, config: Boss2Config = {}) {
    this.col = color;
    this.pal = pal;
    // Boss NEM skálázódik a mélységgel — fix életerő (lásd balance/tuning.ts).
    this.hp = config.hp ?? TUNING.bossFlowerHp;
    this.maxHp = this.hp;
    this.dmg = config.dmg ?? 1.5;
    // Alap Lidérc: csak lézer + spirál (a méreg-kert és a nova levéve).
    this.phases = config.phases ?? ['sweep', 'spiral'];
    // a pontszám viszont a mélységgel nő (jutalom, nem nehézség).
    this.score = 1400 + floor * 450;
  }

  update(dt: number, world: World): void {
    this.flash = Math.max(0, this.flash - dt);
    this.wob += dt * 3;
    this.bob += dt * 4;
    this.laserOn = false;

    const rc = world.room;
    const p = world.player;

    if (this.entering) {
      this.y += this.speed * dt;
      if (this.y >= rc.y + 130) this.entering = false;
    }

    const a = Math.atan2(p.y - this.y, p.x - this.x);
    this.phaseT -= dt;

    switch (this.phase) {
      case 'move': this.doMove(dt, a); break;
      case 'sweep': this.doSweep(dt, world); break;
      case 'garden': this.doGarden(dt, world); break;
      case 'spiral': this.doSpiral(dt, world); break;
      case 'nova': this.doNova(dt, world); break;
    }

    if (this.phaseT <= 0) this.nextPhase(world, a);

    this.x = clamp(this.x, rc.x + this.r, rc.x + rc.w - this.r);
    this.y = clamp(this.y, rc.y + this.r, rc.y + rc.h - this.r);

    // testi ütközés
    const rr = this.r + p.r;
    if (p.alive && (this.x - p.x) ** 2 + (this.y - p.y) ** 2 < rr * rr) {
      world.damagePlayer(this.dmg * HP.half, 'hurt', true); // boss: fix sebzés (nem skálázódik)
      p.knockback(this.x, this.y, 240);
    }
  }

  private nextPhase(world: World, a: number): void {
    if (this.phase !== 'move') {
      // minden támadás után rövid mozgó-szakasz
      this.phase = 'move';
      this.phaseT = 1.1;
      return;
    }
    this.phase = this.phases[this.cycle % this.phases.length]!;
    this.cycle++;
    if (this.phase === 'sweep') {
      this.phaseT = 2.4;
      this.laserAng = a - 0.9; // a játékos egyik oldaláról indít, és átsöpör
      world.audio.boss();
      world.addShake(6);
    } else if (this.phase === 'garden') {
      this.phaseT = 1.4;
      this.shootCd = 0;
    } else if (this.phase === 'spiral') {
      this.phaseT = 2.6;
      this.shootCd = 0;
    } else {
      this.phaseT = 1.2;
      this.shootCd = 0;
    }
  }

  private doMove(dt: number, a: number): void {
    this.x += Math.cos(a) * this.speed * 0.6 * dt;
    this.y += Math.sin(a) * this.speed * 0.4 * dt;
  }

  /** Forgó energiasugár, ami átsöpri a szobát. */
  private doSweep(dt: number, world: World): void {
    this.laserOn = true;
    this.laserAng += dt * 0.9; // lassú forgás
    const wall = this.rayToWall(this.laserAng, world.room);
    this.laserLen = world.rayObstacleDistance(this.x, this.y, this.laserAng, wall); // kőnél megáll
    const p = world.player;
    if (p.alive) {
      const dx = Math.cos(this.laserAng), dy = Math.sin(this.laserAng);
      const rx = p.x - this.x, ry = p.y - this.y;
      const proj = rx * dx + ry * dy;
      const perp = Math.abs(rx * -dy + ry * dx);
      if (proj > 0 && proj < this.laserLen && perp < p.r + 9) {
        world.damagePlayer(this.dmg * HP.half, 'zap', true); // boss: fix sebzés (nem skálázódik)
        world.particles.spawn(p.x, p.y, this.pal.orb, 4, 120, 0.3);
      }
    }
  }

  /** Méreg-tócsák és ködfelhők gyűrűje maga körül. */
  private doGarden(dt: number, world: World): void {
    this.shootCd -= dt;
    if (this.shootCd <= 0) {
      this.shootCd = 0.18;
      const n = TUNING.bossFlowerGarden;
      for (let k = 0; k < n; k++) {
        const an = (k / n) * TAU + this.wob;
        const rr = this.r + 36 + Math.random() * 90;
        const hx = this.x + Math.cos(an) * rr;
        const hy = this.y + Math.sin(an) * rr;
        if (Math.random() < 0.6) world.addHazard('poison', hx, hy, 30, rand(4, 6));
        else world.addHazard('fog', hx, hy, 52, rand(3, 8));
      }
      world.audio.enemyShoot();
    }
  }

  /** Két ellentétes karú, lassan forgó golyó-spirál. */
  private doSpiral(dt: number, world: World): void {
    this.shootCd -= dt;
    this.spiralAng += dt * 2.6;
    if (this.shootCd <= 0) {
      this.shootCd = 0.09;
      const arms = TUNING.bossFlowerSpiralArms;
      for (let i = 0; i < arms; i++) {
        const an = this.spiralAng + (i / arms) * TAU;
        world.ebullets.push({ x: this.x, y: this.y, vx: Math.cos(an) * 190, vy: Math.sin(an) * 190, r: 7, life: 5 });
      }
      world.audio.enemyShoot();
    }
  }

  /** Egyszeri táguló tűzgyűrű égő foltokból. */
  private doNova(dt: number, world: World): void {
    this.shootCd -= dt;
    if (this.shootCd <= 0 && this.phaseT > 0.3) {
      this.shootCd = 0.16;
      const ringR = (1.2 - this.phaseT) * 360;
      const n = TUNING.bossFlowerNova;
      for (let k = 0; k < n; k++) {
        const an = (k / n) * TAU + this.wob * 0.5;
        world.addHazard('fire', this.x + Math.cos(an) * ringR, this.y + Math.sin(an) * ringR, 24, rand(0.8, 1.4));
      }
      world.addShake(3);
    }
  }

  private rayToWall(ang: number, rc: { x: number; y: number; w: number; h: number }): number {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let len = Math.hypot(rc.w, rc.h);
    if (dx > 1e-4) len = Math.min(len, (rc.x + rc.w - this.x) / dx);
    if (dx < -1e-4) len = Math.min(len, (rc.x - this.x) / dx);
    if (dy > 1e-4) len = Math.min(len, (rc.y + rc.h - this.y) / dy);
    if (dy < -1e-4) len = Math.min(len, (rc.y - this.y) / dy);
    return Math.max(0, len);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const flash = this.flash > 0;
    const float = Math.sin(this.bob) * 6;
    const pal = this.pal;

    // söprő lézersugár (a test mögé)
    if (this.laserOn) {
      const ax = Math.cos(this.laserAng), ay = Math.sin(this.laserAng);
      const ex = this.x + ax * this.laserLen;
      const ey = this.y + float + ay * this.laserLen;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = pal.laserHalo;
      ctx.lineWidth = 22;
      ctx.beginPath(); ctx.moveTo(this.x, this.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = pal.laserCore;
      ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(this.x, this.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(this.x, this.y + float); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.restore();
    }

    // talaj-árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.r * 1.05, this.r * 1.1, this.r * 0.4, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(this.x, this.y + float);

    // szellem-aura
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, this.r * 2);
    aura.addColorStop(0, pal.aura);
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 2, 0, TAU);
    ctx.fill();

    // keringő varázsgömbök
    for (let i = 0; i < 3; i++) {
      const a = this.wob * 1.2 + (i / 3) * TAU;
      const ox = Math.cos(a) * this.r * 1.5;
      const oy = Math.sin(a) * this.r * 1.5 * 0.6;
      softGlow(ctx, ox, oy, 16, pal.glow);
      ctx.fillStyle = pal.orb;
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, TAU);
      ctx.fill();
    }

    // rongyos lepel-test
    const g = ctx.createLinearGradient(0, -this.r, 0, this.r * 1.3);
    g.addColorStop(0, flash ? '#fff' : pal.robeTop);
    g.addColorStop(0.6, flash ? '#fff' : pal.robeMid);
    g.addColorStop(1, pal.robeBottom);
    ctx.fillStyle = g;
    ctx.strokeStyle = pal.robeStroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-this.r, -this.r * 0.2);
    ctx.quadraticCurveTo(-this.r * 1.1, -this.r, 0, -this.r);
    ctx.quadraticCurveTo(this.r * 1.1, -this.r, this.r, -this.r * 0.2);
    const tat = 7;
    for (let i = tat; i >= 0; i--) {
      const tx = -this.r + (i / tat) * this.r * 2;
      const low = this.r * (1.0 + Math.sin(this.wob * 1.6 + i) * 0.35);
      ctx.quadraticCurveTo(tx + 6, low, tx - 8, this.r * 0.55);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // csuklya-üreg
    ctx.fillStyle = pal.hood;
    ctx.beginPath();
    ctx.ellipse(0, -this.r * 0.35, this.r * 0.62, this.r * 0.66, 0, 0, TAU);
    ctx.fill();

    // koponya-arc
    ctx.fillStyle = flash ? '#fff' : pal.skull;
    ctx.beginPath();
    ctx.ellipse(0, -this.r * 0.3, this.r * 0.4, this.r * 0.46, 0, 0, TAU);
    ctx.fill();
    // állkapocs-él
    ctx.fillStyle = pal.jaw;
    ctx.beginPath();
    ctx.ellipse(0, -this.r * 0.05, this.r * 0.26, this.r * 0.18, 0, 0, Math.PI);
    ctx.fill();

    // szemgödrök, izzó
    for (const sgn of [-1, 1]) {
      ctx.fillStyle = pal.socket;
      ctx.beginPath();
      ctx.ellipse(sgn * this.r * 0.17, -this.r * 0.34, this.r * 0.12, this.r * 0.15, 0, 0, TAU);
      ctx.fill();
      softGlow(ctx, sgn * this.r * 0.17, -this.r * 0.34, this.r * 0.14, pal.glow);
      ctx.fillStyle = flash ? '#fff' : pal.eye;
      ctx.beginPath();
      ctx.arc(sgn * this.r * 0.17, -this.r * 0.34, this.r * 0.06, 0, TAU);
      ctx.fill();
    }
    // homlok-harmadik szem
    softGlow(ctx, 0, -this.r * 0.55, this.r * 0.2, pal.thirdEyeGlow);
    ctx.fillStyle = flash ? '#fff' : pal.thirdEye;
    ctx.beginPath();
    ctx.ellipse(0, -this.r * 0.55, this.r * 0.1, this.r * 0.14, 0, 0, TAU);
    ctx.fill();

    // fog-vonal
    ctx.strokeStyle = pal.socket;
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.r * 0.1, -this.r * 0.12);
      ctx.lineTo(i * this.r * 0.1, -this.r * 0.02);
      ctx.stroke();
    }

    // a variánsok extra dísze (alapból semmi) — mindenek elé
    this.drawAccents(ctx, flash);

    ctx.restore();
  }

  /**
   * Variáns-dísz a test lokális koordinátáiban (mindenek elé rajzolva). Az alap
   * Lidércnek nincs (üres hook); A lidérc mérge csöpögő méreg-cseppeket rajzol.
   */
  protected drawAccents(_ctx: CanvasRenderingContext2D, _flash: boolean): void {}
}
