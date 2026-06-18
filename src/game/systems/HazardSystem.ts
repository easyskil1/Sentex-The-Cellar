import type { World } from '../World';
import type { Hazard, HazardKind } from '../types';
import { TAU, clamp, dist2 } from '../../engine/math';
import { HP } from '../config';

/**
 * Talaj-veszélyek rendszere: méreg-/tűz-tócsák, ködfelhők és aknák. Saját
 * állapotot tart (a `World` korábbi `hazards` tömbje), a `World` vékony
 * facade-on át delegál ide (`addHazard`), így az ellenfelek/bossok hívási
 * helyei VÁLTOZATLANOK. A sebzést/hangot/részecskét a `World` koordinátoron át
 * intézi (`damagePlayer`, `audio`, `particles`, `collision`).
 */
export class HazardSystem {
  private hazards: Hazard[] = [];

  constructor(private readonly w: World) {}

  /** Új futás / mód-váltás: a veszélyek törlése. */
  clear(): void {
    this.hazards.length = 0;
  }

  /** Tűz/láva-veszélyek fény-emissziójához (LightingSystem): pulzáló sugár az életkorral. */
  forEachFire(cb: (x: number, y: number, r: number) => void): void {
    for (const h of this.hazards) if (h.kind === 'fire' && h.age >= (h.arm ?? 0)) cb(h.x, h.y, h.r);
  }

  /** Talaj-veszély lerakása (ellenfelek hívják: méreg/tűz/köd/akna). */
  add(kind: HazardKind, x: number, y: number, r: number, life: number, arm = 0): void {
    // a szobán belülre szorítjuk, hogy ne lógjon ki a falba
    const rc = this.w.room;
    x = clamp(x, rc.x + 6, rc.x + rc.w - 6);
    y = clamp(y, rc.y + 6, rc.y + rc.h - 6);
    this.hazards.push({ kind, x, y, r, life, maxLife: life, age: 0, tick: 0, arm });
  }

  update(dt: number): void {
    const p = this.w.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]!;
      h.age += dt;
      h.life -= dt;
      if (h.tick > 0) h.tick -= dt;

      if (h.life <= 0) {
        if (h.kind === 'mine') this.explodeMine(h);
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'poison' || h.kind === 'fire') {
        const armed = h.age >= (h.arm ?? 0); // telegraf alatt csak látszik, nem sebez
        const reach = h.r + p.r * 0.4;
        if (armed && p.alive && dist2(p.x, p.y, h.x, h.y) < reach * reach && h.tick <= 0) {
          h.tick = 0.5;
          this.w.damagePlayer(HP.half, h.kind === 'fire' ? 'burn' : 'acid');
          this.w.particles.spawn(p.x, p.y, h.kind === 'fire' ? '#ff7a1e' : '#8fbf4a', 5, 120, 0.3);
        }
      } else if (h.kind === 'mine') {
        // ha a játékos RÁLÉP egy már beélesedett aknára, hamarabb robban — de van
        // egy türelmi idő a becsapódás után, hogy a rád dobott bomba elől el lehessen futni
        if (p.alive && h.age > 0.7 && dist2(p.x, p.y, h.x, h.y) < (p.r + 12) ** 2 && h.life > 0.4) h.life = 0.4;
      }
      // fog: nem sebez, csak a látást zavarja (lásd draw)
    }
  }

  private explodeMine(h: Hazard): void {
    this.w.audio.boom();
    this.w.addShake(12);
    this.w.particles.spawn(h.x, h.y, '#ff8a3a', 26, 340, 0.6);
    this.w.particles.spawn(h.x, h.y, '#ffd36a', 14, 260, 0.5);
    this.w.particles.spawn(h.x, h.y, '#777777', 14, 200, 0.7);
    const r2 = h.r * h.r;
    if (this.w.player.alive && dist2(this.w.player.x, this.w.player.y, h.x, h.y) <= r2) {
      this.w.damagePlayer(HP.heart);
    }
    // tárgyak szétrobbantása (mint a sima bomba: + alak; a víz megmarad)
    this.w.collision.destroyObstaclesAround(h.x, h.y, 1.1);
  }

  /** Talaj-veszélyek (méreg/tűz/akna) az entitások ALÁ — a köd külön (lásd drawFog). */
  draw(ctx: CanvasRenderingContext2D): void {
    const t = performance.now() / 1000;
    for (const h of this.hazards) {
      if (h.kind === 'fog') continue; // a köd külön, az entitások fölé rajzolódik

      // becsapódó AoE telegraf: amíg élesedik, csak FIGYELMEZTETŐ zóna látszik (nem sebez)
      const arm = h.arm ?? 0;
      if (arm > 0 && h.age < arm) {
        const k = clamp(h.age / arm, 0, 1); // 0 → 1 a becsapódásig
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.14 * k; // halvány kitöltés a cél-sugárban
        ctx.fillStyle = '#ff7a2a';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t * 14)); // lüktető külső gyűrű
        ctx.strokeStyle = '#ffd23a';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 7]);
        ctx.lineDashOffset = -t * 22;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.7; // záródó belső gyűrű → a becsapódás közeledte
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r * (1 - k * 0.75), 0, TAU);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      const grow = clamp(h.age / 0.3, 0, 1);
      const fade = clamp(h.life / 0.6, 0, 1); // utolsó 0.6 mp-ben halványul
      const r = h.r * grow;
      ctx.save();
      if (h.kind === 'poison') {
        ctx.globalAlpha = 0.55 * fade;
        const g = ctx.createRadialGradient(h.x, h.y, r * 0.2, h.x, h.y, r);
        g.addColorStop(0, '#bfff6a');
        g.addColorStop(0.6, '#6f9f2a');
        g.addColorStop(1, 'rgba(50,80,18,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, r, r * 0.66, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.6 * fade;
        ctx.fillStyle = '#dcff7a';
        for (let i = 0; i < 3; i++) {
          const a = t * 1.6 + i * 2.1 + h.x;
          ctx.beginPath();
          ctx.arc(h.x + Math.cos(a) * r * 0.4, h.y + Math.sin(a * 1.3) * r * 0.26, 1.6 + (Math.sin(t * 4 + i) * 0.5 + 0.5) * 2, 0, TAU);
          ctx.fill();
        }
      } else if (h.kind === 'fire') {
        ctx.globalAlpha = 0.8 * fade;
        const wob = 1 + Math.sin(t * 12 + h.x) * 0.14;
        for (const [rr, c] of [[r, '#7a1500'], [r * 0.72, '#ff5a1e'], [r * 0.44, '#ffb13a'], [r * 0.2, '#fff3b0']] as const) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.ellipse(h.x, h.y - (r - rr) * 0.4, rr * wob, rr * 0.8 * wob, 0, 0, TAU);
          ctx.fill();
        }
      } else {
        // mine — robbanási kör + ketyegő mag
        const blink = h.life < 0.6 ? (Math.sin(h.life * 42) > 0 ? 1 : 0.25) : 0.5 + Math.sin(t * 6) * 0.3;
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#ff5a3a';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#ff5a3a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.r, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#26221a';
        ctx.strokeStyle = '#15120c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 10, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = `rgba(255,90,40,${blink})`;
        ctx.shadowColor = '#ff5a2a';
        ctx.shadowBlur = 12 * blink;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4.5, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }
  }

  /**
   * Ködfelhők — az entitások FÖLÉ rajzolva, hogy ténylegesen eltakarják, ami
   * alattuk van (ellenfél, lövedék). Több kavargó, részben átlátszó puffból állnak.
   */
  drawFog(ctx: CanvasRenderingContext2D): void {
    const t = performance.now() / 1000;
    for (const h of this.hazards) {
      if (h.kind !== 'fog') continue;
      const appear = clamp(h.age / 0.8, 0, 1);   // lassan gomolyog be
      const fade = clamp(h.life / 1.2, 0, 1);     // lassan oszlik el
      const r = h.r * (0.65 + 0.35 * appear);
      const alpha = 0.7 * appear * fade;
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const a = t * 0.3 + i * 1.3 + h.x * 0.2;
        const ox = h.x + Math.cos(a) * r * 0.3;
        const oy = h.y + Math.sin(a * 0.8) * r * 0.22;
        const rr = r * (0.7 + 0.1 * i);
        const g = ctx.createRadialGradient(ox, oy, rr * 0.15, ox, oy, rr);
        g.addColorStop(0, `rgba(214,209,232,${alpha})`);
        g.addColorStop(0.55, `rgba(182,174,208,${alpha * 0.66})`);
        g.addColorStop(1, 'rgba(170,160,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, oy, rr, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
