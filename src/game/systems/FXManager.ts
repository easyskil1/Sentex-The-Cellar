import type { Floater } from '../types';
import { rand, clamp } from '../../engine/math';
import { loadShake, loadGameFeel } from '../settings';

/**
 * Effekt-réteg: lebegő szövegek (státusz + sebzésszámok) és a képernyőrázás.
 * Saját állapotot tart (a `World` korábbi `floaters`/`shake` mezői), a `World`
 * vékony facade-on át delegál ide (`addFloater`/`addDamage`/`addShake`), így az
 * entitások hívási helyei VÁLTOZATLANOK. A részecskéket külön `ParticleSystem`
 * kezeli — ez csak a szöveg- és rázás-effekteket koordinálja.
 */
export class FXManager {
  private floaters: Floater[] = [];
  /** Aktuális képernyőrázás-erősség (a render ezt olvassa a kamera-eltoláshoz). */
  shake = 0;
  /** Felhasználói rázás-szorzó (0 = kikapcsolva, 1 = teljes) - a Beállítások állítja. */
  shakeScale = loadShake();
  /** „Játékérzet"-effektek kapcsolója (csőtorkolat-villanás, visszarúgás, kamera-kick). */
  gameFeel = loadGameFeel();
  /** Kamera-kick eltolás (lövéskor a lövés ELLEN rúg, majd visszalendül). */
  kickX = 0;
  kickY = 0;
  /**
   * Kamera-LERP (#70): a nézet finoman a CÉLZÁS irányába csúszik (a kickkel
   * ellentétben tartós, amíg lősz; lövés nélkül lágyan középre húz). Külön a
   * kicktől, mert más a karaktere (lassú lerp vs. rugós rántás).
   */
  lookX = 0;
  lookY = 0;
  private lookTargetX = 0;
  private lookTargetY = 0;

  /** Game-feel kapcsoló (Beállítások · Grafika); kikapcsoláskor a kick+lerp lecseng. */
  setGameFeel(v: boolean): void {
    this.gameFeel = v;
    if (!v) { this.kickX = 0; this.kickY = 0; this.lookTargetX = 0; this.lookTargetY = 0; }
  }

  /**
   * Kamera-LERP célzás-cél beállítása (a Player.shoot hívja az aktuális lövés-
   * iránnyal). A nézet ennek a kis eltolásnak a felé simul; ha nem lősz, a cél
   * magától visszahúz 0-ra (lásd tickShake). Csak ha a game-feel BE van.
   */
  setCamLook(dirX: number, dirY: number): void {
    if (!this.gameFeel) return;
    const D = 9; // finom eltolás px-ben (szándékosan kicsi, hogy ne legyen szédítő)
    this.lookTargetX = dirX * D;
    this.lookTargetY = dirY * D;
  }

  /**
   * Kamera-kick: rövid eltolás `(dirX,dirY)` irányba, `amount` erővel. A lövés
   * a `shoot` ELLEN irányba rúg (lásd Player.shoot). Csak ha a game-feel BE van.
   */
  addKick(dirX: number, dirY: number, amount: number): void {
    if (!this.gameFeel) return;
    this.kickX = clamp(this.kickX + dirX * amount, -10, 10);
    this.kickY = clamp(this.kickY + dirY * amount, -10, 10);
  }

  /** A teljes kamera-eltolás X-ben: rázás-jitter + kick (a render olvassa). */
  camOffX(): number {
    return (this.shake > 0 ? rand(-this.shake, this.shake) * 0.5 : 0) + this.kickX + this.lookX;
  }
  /** A teljes kamera-eltolás Y-ban: rázás-jitter + kick + célzás-lerp. */
  camOffY(): number {
    return (this.shake > 0 ? rand(-this.shake, this.shake) * 0.5 : 0) + this.kickY + this.lookY;
  }

  /** Új futás / mód-váltás: a lebegő szövegek törlése. */
  clear(): void {
    this.floaters.length = 0;
  }

  addShake(v: number): void {
    if (this.shakeScale <= 0) return;
    this.shake = Math.min(this.shake + v * this.shakeScale, 20);
  }

  /** Rázás-szorzó beállítása (a Beállítások · Grafika csúszkája). */
  setShakeScale(v: number): void {
    this.shakeScale = Math.max(0, Math.min(1, v));
  }

  addFloater(x: number, y: number, text: string, color = '#f3e2bf'): void {
    this.floaters.push({ x, y, text, color, life: 1.1, vy: -46 });
  }

  /**
   * Lebegő SEBZÉSSZÁM — harci visszajelzés a találatokról. Felpattan, kissé
   * elsodródik (hogy a sorozat-találatok ne fedjék egymást) és elhalványul.
   * A szám a HUD konvencióját követi (valós sebzés-pont). A `toPlayer` a
   * bejövő sebzés (piros, − előjel); egyébként kifelé adott sebzés.
   */
  addDamage(x: number, y: number, amount: number, opts: { color?: string; toPlayer?: boolean } = {}): void {
    const v = Math.round(amount);
    if (v <= 0) return;
    const color = opts.color ?? (opts.toPlayer ? '#ff5b6a' : '#fff2c8');
    // visszafogott méret: a nagyobb ütés alig nagyobb (kicsi, nem tolakodó)
    const size = clamp((opts.toPlayer ? 13 : 11) + Math.sqrt(v) * 0.1, 11, 17);
    this.floaters.push({
      x: x + rand(-6, 6),
      y,
      text: opts.toPlayer ? `−${v}` : `${v}`,
      color,
      life: 0.9,
      max: 0.9,
      vy: opts.toPlayer ? -64 : -96,
      vx: rand(-26, 26),
      size,
    });
  }

  /** Lebegő szövegek léptetése + a képernyőrázás lecsengése (aktív játékmenet/hub). */
  update(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.y += f.vy * dt;
      // sebzésszám (max van): felpattan, majd visszaível és a sodródás lecseng
      if (f.max !== undefined) {
        f.x += (f.vx ?? 0) * dt;
        f.vy += 150 * dt;
        if (f.vx) f.vx *= 0.9;
      }
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    this.tickShake(dt);
  }

  /** Csak a képernyőrázás + kamera-kick lecsengése (szünet/menü alatt is). */
  tickShake(dt: number): void {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 38);
    // kick: gyors, rugós visszalendülés a nyugalmi (0) felé
    if (this.kickX !== 0 || this.kickY !== 0) {
      const decay = Math.max(0, 1 - dt * 16);
      this.kickX *= decay;
      this.kickY *= decay;
      if (Math.abs(this.kickX) < 0.05) this.kickX = 0;
      if (Math.abs(this.kickY) < 0.05) this.kickY = 0;
    }
    // kamera-LERP: a cél lövés nélkül magától középre húz, az eltolás lágyan követi
    this.lookTargetX *= Math.max(0, 1 - dt * 5);
    this.lookTargetY *= Math.max(0, 1 - dt * 5);
    this.lookX += (this.lookTargetX - this.lookX) * Math.min(1, dt * 6);
    this.lookY += (this.lookTargetY - this.lookY) * Math.min(1, dt * 6);
    if (Math.abs(this.lookX) < 0.02 && Math.abs(this.lookTargetX) < 0.02) this.lookX = 0;
    if (Math.abs(this.lookY) < 0.02 && Math.abs(this.lookTargetY) < 0.02) this.lookY = 0;
  }

  /** Lebegő szövegek kirajzolása (sebzésszám pop+kontúr, egyéb státusz halványuló). */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const f of this.floaters) {
      if (f.max !== undefined) {
        // sebzésszám: gyors „pop” az elején, finom zsugorodás a végén, sötét kontúr
        const age = f.max - f.life;
        const pop = age < 0.1 ? 0.5 + 5 * age : 1; // 0.5→1.0 az első 0.1 mp-ben
        const scale = pop * (0.85 + 0.15 * clamp(f.life / 0.3, 0, 1));
        ctx.globalAlpha = clamp(f.life / 0.3, 0, 1);
        ctx.font = `${((f.size ?? 13) * scale).toFixed(1)}px system-ui`;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      } else {
        ctx.globalAlpha = clamp(f.life, 0, 1);
        ctx.font = 'bold 15px system-ui';
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
