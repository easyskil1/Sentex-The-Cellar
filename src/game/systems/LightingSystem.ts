/**
 * 2D fény-térkép (Canvas 2D, NINCS WebGL). A modern, olcsó recept:
 *   1) egy offscreen bufferbe AMBIENT sötétséget töltünk (hideg dungeon-árnyalat),
 *   2) a fényforrásokat additív (`lighter`) radiális bélyegzőkkel a bufferbe rajzoljuk
 *      — ahol fény van, a buffer a fehér felé világosodik,
 *   3) a buffert MULTIPLY módban tesszük a fő canvasra: a megvilágítatlan részek az
 *      ambient felé sötétednek, a lámpák körül teljes fényerő + meleg szín.
 * A forró úton csak egy fillRect + N gyorsítótárazott bélyegző (drawImage) + egy
 * záró drawImage fut — nincs képkockánkénti gradiens-allokáció (GC-barát). A
 * lámpa-tömböt is újrahasználjuk.
 */

/** Szín szerint gyorsítótárazott, TELJES magú fény-bélyegző (a mag felfedi a jelenetet). */
const lightStamps = new Map<string, HTMLCanvasElement>();
function lightStamp(color: string): HTMLCanvasElement {
  let s = lightStamps.get(color);
  if (s) return s;
  const S = 128, r = S / 2;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const c = cv.getContext('2d')!;
  // tömör szín + radiális alfa-maszk (bármilyen színformátum működik)
  c.fillStyle = color;
  c.fillRect(0, 0, S, S);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');     // teljes mag → teljes megvilágítás
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');     // lágy szél → ambientbe olvad
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  lightStamps.set(color, cv);
  return cv;
}

interface Light { x: number; y: number; r: number; color: string; intensity: number; }

export class LightingSystem {
  /** Ambient fényerő (0 = koromfekete, 1 = nappal). A megvilágítatlan rész szorzója. */
  ambient = 0.5;
  /** Az ambient sötétség hideg árnyalata (dungeon-hangulat), 0..255 csatornák. */
  tintR = 150; tintG = 158; tintB = 200;

  /**
   * Fény-térkép felbontás-szorzó (a grafikai beállítás állítja): 1 = teljes
   * felbontás, éles árnyékperem; <1 = kisebb buffer + simított visszanagyítás
   * → lágy árnyékperem (penumbra) és más teljesítmény-profil. (0.5 = fél.)
   */
  quality = 1;

  private buffer: HTMLCanvasElement | null = null;
  /**
   * Teljes felbontású segéd-buffer a lágy (quality<1) módhoz: ide nagyítjuk fel a
   * kis fény-buffert SIMÍTVA (source-over, blend nélkül), majd onnan tesszük ki
   * 1:1 multiply-jal. Ld. a render() 3) lépését - miért nem egyetlen lépésben.
   */
  private upscaleBuffer: HTMLCanvasElement | null = null;
  /** Lámpa-pool: a tömböt frame-ek közt újrahasználjuk, csak az aktív darabszám változik. */
  private readonly lights: Light[] = [];
  private n = 0;

  /** Árnyékvető fő-lámpa (fáklya): a fénye a látható-poligonra van vágva. */
  private shadow: (Light & { poly: number[] }) | null = null;

  /** Új frame: a lámpalista logikai ürítése (nincs allokáció). */
  begin(): void { this.n = 0; this.shadow = null; }

  /**
   * Árnyékvető fő-lámpa beállítása: a `poly` a fénypontból látható terület
   * poligonja (lásd {@link computeVisibility}); a fényt erre vágjuk, így a
   * takarók (kövek) mögött sötét marad. A `poly` a hívó újrahasznált tömbje.
   */
  setShadowLight(x: number, y: number, r: number, color: string, intensity: number, poly: number[]): void {
    this.shadow = { x, y, r, color, intensity, poly };
  }

  /** Fényforrás hozzáadása (a Light objektumokat újrahasználjuk). */
  add(x: number, y: number, r: number, color: string, intensity = 1): void {
    const L = this.lights[this.n];
    if (L) { L.x = x; L.y = y; L.r = r; L.color = color; L.intensity = intensity; }
    else this.lights.push({ x, y, r, color, intensity });
    this.n++;
  }

  private ensureBuffer(w: number, h: number, dpr: number): HTMLCanvasElement {
    const s = dpr * this.quality;
    const bw = Math.max(1, Math.round(w * s));
    const bh = Math.max(1, Math.round(h * s));
    let cv = this.buffer;
    if (!cv) { cv = document.createElement('canvas'); this.buffer = cv; }
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    return cv;
  }

  /** Teljes (dpr) felbontású segéd-buffer a lágy mód kétlépéses kitételéhez. */
  private ensureUpscaleBuffer(w: number, h: number, dpr: number): HTMLCanvasElement {
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    let cv = this.upscaleBuffer;
    if (!cv) { cv = document.createElement('canvas'); this.upscaleBuffer = cv; }
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    return cv;
  }

  /**
   * A fény-térkép kitétele a fő canvasra. `w`/`h` logikai (CSS) méret, `dpr` az
   * eszköz-pixelarány. `quality` < 1 esetén a buffer kisebb és simítva nagyítjuk
   * vissza (lágy árnyékperem). Ha nincs sötétítés (ambient≈1) és nincs lámpa, kihagyja.
   */
  render(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
    if (this.ambient >= 0.999 && this.n === 0) return;
    const buf = this.ensureBuffer(w, h, dpr);
    const b = buf.getContext('2d');
    if (!b) return;
    const s = dpr * this.quality;
    b.setTransform(s, 0, 0, s, 0, 0);

    // 1) ambient sötétség-alap (a multiply ehhez sötétíti a megvilágítatlan részt)
    b.globalCompositeOperation = 'source-over';
    b.globalAlpha = 1;
    b.fillStyle = `rgb(${Math.round(this.ambient * this.tintR)},${Math.round(this.ambient * this.tintG)},${Math.round(this.ambient * this.tintB)})`;
    b.fillRect(0, 0, w, h);

    // 2) lámpák additívan (a fehér felé világosítanak)
    b.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.n; i++) {
      const L = this.lights[i]!;
      b.globalAlpha = Math.max(0, Math.min(1, L.intensity));
      b.drawImage(lightStamp(L.color), L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }

    // 2b) árnyékvető fő-lámpa: a fáklyát a látható-poligonra vágjuk (kövek → árnyék)
    const sh = this.shadow;
    if (sh && sh.poly.length >= 6) {
      b.save();
      b.beginPath();
      b.moveTo(sh.poly[0]!, sh.poly[1]!);
      for (let i = 2; i < sh.poly.length; i += 2) b.lineTo(sh.poly[i]!, sh.poly[i + 1]!);
      b.closePath();
      b.clip();
      b.globalAlpha = Math.max(0, Math.min(1, sh.intensity));
      b.drawImage(lightStamp(sh.color), sh.x - sh.r, sh.y - sh.r, sh.r * 2, sh.r * 2);
      b.restore();
    }

    // 3) a fény-térkép a fő canvasra MULTIPLY módban.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 1;
    if (this.quality < 1) {
      // Lágy mód: a kis buffert NEM egy lépésben nagyítjuk + szorozzuk a canvasra.
      // A `multiply` + bilineáris `imageSmoothingEnabled` + felnagyítás EGYÜTT a
      // Canvas2D-ben lassú (nem GPU-gyorsított) útra esik, és megduplázza a
      // képkocka-időt. Ezért kétlépés, mindkettő a gyors úton:
      //   a) SIMÍTOTT felnagyítás teljes felbontású segéd-bufferbe, blend NÉLKÜL
      //      (source-over) - ez adja a lágy árnyékperemet,
      //   b) a segéd-buffer 1:1 kitétele multiply-jal, simítás NÉLKÜL (mint a hard).
      const up = this.ensureUpscaleBuffer(w, h, dpr);
      const u = up.getContext('2d');
      if (u) {
        u.globalCompositeOperation = 'source-over';
        u.imageSmoothingEnabled = true;
        u.clearRect(0, 0, up.width, up.height);
        u.drawImage(buf, 0, 0, up.width, up.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(up, 0, 0, w, h);
      }
    } else {
      // Éles mód: a buffer már teljes felbontású → 1:1 kirakás, simítás nélkül.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(buf, 0, 0, w, h);
    }
    ctx.restore();
  }
}
