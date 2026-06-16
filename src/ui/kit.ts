/**
 * Közös admin-UI építőelemek (Fázis 0).
 *
 * Minden admin lap EZEKBŐL épül, hogy egységes, letisztult, „eszköz"-jellegű
 * (nem játékos-grafikus) felület legyen. Tisztán DOM — a régi canvas-rajzolású
 * viewereket fokozatosan ezek váltják fel (lásd ADMIN_TEENDOK.md).
 */

/** Egy DOM-alapú admin lap életciklusa (a Game mountolja/unmountolja). */
export interface AdminPanel {
  /** Felépíti és beilleszti a tartalmát a megadott konténerbe. */
  mount(host: HTMLElement): void;
  /** Eltávolítja a DOM-tartalmát (az eseménykezelők a csomóponttal együtt elszállnak). */
  unmount(): void;
}

type Child = Node | string | null | undefined | false;

interface ElOpts {
  class?: string;
  text?: string;
  title?: string;
  style?: string;
}

/** Általános elem-építő: tag + attribútumok + gyerekek. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: ElOpts,
  children?: Child[],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts?.class) node.className = opts.class;
  if (opts?.text !== undefined) node.textContent = opts.text;
  if (opts?.title) node.title = opts.title;
  if (opts?.style) node.setAttribute('style', opts.style);
  if (children) for (const c of children) if (c) node.append(c);
  return node;
}

/** Lap-fejléc: cím + egymondatos magyarázat (minden lap tetején, egységesen). */
export function pageHeader(title: string, subtitle?: string): HTMLElement {
  return el('div', { class: 'adm-head' }, [
    el('h2', { class: 'adm-h2', text: title }),
    subtitle ? el('p', { class: 'adm-sub', text: subtitle }) : null,
  ]);
}

/** Szekció-kártya opcionális címmel. */
export function panel(title?: string, children?: Child[]): HTMLElement {
  return el('section', { class: 'adm-panel' }, [
    title ? el('h3', { class: 'adm-panel-title', text: title }) : null,
    ...(children ?? []),
  ]);
}

export type BtnVariant = 'primary' | 'ghost' | 'danger';

/** Egységes gomb. */
export function button(label: string, onClick: () => void, variant: BtnVariant = 'ghost'): HTMLButtonElement {
  const b = el('button', { class: `adm-btn ${variant}`, text: label });
  b.addEventListener('click', onClick);
  return b;
}

/** Reszponzív kártya-rács (a `minPx` a kártya minimális szélessége). */
export function grid(children: Child[], minPx = 230): HTMLElement {
  return el('div', { class: 'adm-grid', style: `--min:${minPx}px` }, children);
}

export interface NumberFieldOpts {
  /** Bal oldali címke (a `numberField`-nél; a `stepper`-nél nincs). */
  label?: string;
  /** Opcionális magyarázó sor a címke alatt (csak `numberField`-nél). */
  help?: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  /** Tizedesjegyek a kijelzésen. */
  dec?: number;
  onChange: (v: number) => void;
}

/** Csak a − [érték] + vezérlő (címke nélkül) — táblázat-cellákhoz. */
export function stepper(o: NumberFieldOpts): HTMLElement {
  const step = o.step ?? 1;
  const dec = o.dec ?? 0;
  const min = o.min ?? -Infinity;
  const max = o.max ?? Infinity;
  let val = o.value;

  const input = el('input', { class: 'adm-num-input' }) as HTMLInputElement;
  input.type = 'text';
  input.inputMode = 'decimal';

  const show = (): void => { input.value = val.toFixed(dec); };
  const commit = (raw: number): void => {
    let v = Number.isFinite(raw) ? raw : val;
    v = Math.min(max, Math.max(min, v));
    v = Math.round(v / step) * step;
    v = Number(v.toFixed(6)); // lebegőpontos zaj levágása
    val = v;
    show();
    o.onChange(val);
  };

  input.addEventListener('change', () => commit(parseFloat(input.value.replace(',', '.'))));
  const minus = el('button', { class: 'adm-step', text: '−' });
  const plus = el('button', { class: 'adm-step', text: '+' });
  minus.addEventListener('click', () => commit(val - step));
  plus.addEventListener('click', () => commit(val + step));
  show();

  return el('span', { class: 'adm-stepper' }, [minus, input, plus]);
}

/** Címkézett szám-mező: bal címke (+ opcionális súgó) + stepper, sorvonallal. */
export function numberField(o: NumberFieldOpts): HTMLElement {
  const label = el('span', { class: 'adm-field-label' }, [
    o.label ?? '',
    o.help ? el('small', { class: 'adm-field-help', text: o.help }) : null,
  ]);
  return el('label', { class: 'adm-field' }, [label, stepper(o)]);
}

export interface TextFieldOpts {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}

/** Címkézett egysoros szöveg-mező, sorvonallal (pl. fejezet-név, boss-név). */
export function textField(o: TextFieldOpts): HTMLElement {
  const input = el('input', { class: 'adm-text-input' }) as HTMLInputElement;
  input.type = 'text';
  input.value = o.value;
  if (o.placeholder) input.placeholder = o.placeholder;
  input.addEventListener('change', () => o.onChange(input.value));
  return el('label', { class: 'adm-field' }, [
    el('span', { class: 'adm-field-label', text: o.label }),
    input,
  ]);
}

export interface TextAreaOpts {
  label?: string;
  value: string;
  rows?: number;
  placeholder?: string;
  onChange: (v: string) => void;
}

/** Címkézett többsoros szövegdoboz (pl. fejezet-sztori). A címke a doboz fölött. */
export function textArea(o: TextAreaOpts): HTMLElement {
  const ta = el('textarea', { class: 'adm-textarea' }) as HTMLTextAreaElement;
  ta.value = o.value;
  ta.rows = o.rows ?? 4;
  if (o.placeholder) ta.placeholder = o.placeholder;
  ta.addEventListener('change', () => o.onChange(ta.value));
  return el('div', { class: 'adm-textarea-wrap' }, [
    o.label ? el('span', { class: 'adm-field-label', text: o.label }) : null,
    ta,
  ]);
}

export interface ToggleOpts {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  /** Be/ki feliratok — alapból magyar (admin); a játék-UI angolt ad át. */
  onLabel?: string;
  offLabel?: string;
}

/** Címkézett be/ki kapcsoló, sorvonallal. */
export function toggleField(o: ToggleOpts): HTMLElement {
  let val = o.value;
  const onText = o.onLabel ?? 'BE';
  const offText = o.offLabel ?? 'KI';
  const btn = el('button', { class: 'adm-toggle', text: val ? onText : offText });
  btn.classList.toggle('on', val);
  btn.addEventListener('click', () => {
    val = !val;
    btn.textContent = val ? onText : offText;
    btn.classList.toggle('on', val);
    o.onChange(val);
  });
  return el('label', { class: 'adm-field' }, [
    el('span', { class: 'adm-field-label', text: o.label }),
    btn,
  ]);
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOpts {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  title?: string;
  class?: string;
}

/** Kompakt legördülő (natív <select>) — pl. a MAP lap kategória-választói. */
export function select(o: SelectOpts): HTMLSelectElement {
  const s = el('select', { class: `adm-select${o.class ? ` ${o.class}` : ''}` }) as HTMLSelectElement;
  if (o.title) s.title = o.title;
  for (const opt of o.options) {
    const node = el('option', { text: opt.label }) as HTMLOptionElement;
    node.value = opt.value;
    if (opt.disabled) node.disabled = true;
    s.append(node);
  }
  s.value = o.value;
  s.addEventListener('change', () => o.onChange(s.value));
  return s;
}

/** Egyszerű táblázat sorvonalakkal + zebrával (balansz/zsákmány lapokhoz). */
export function table(headers: string[], rows: Child[][]): HTMLElement {
  const thead = el('thead', {}, [
    el('tr', {}, headers.map((h) => el('th', { text: h }))),
  ]);
  const tbody = el('tbody', {}, rows.map((cells) =>
    el('tr', {}, cells.map((c) => el('td', {}, [c]))),
  ));
  return el('table', { class: 'adm-table' }, [thead, tbody]);
}

export interface SaveBarOpts {
  /** A „Mentés fájlba" akciója; a visszaadott szöveg a státuszsorba kerül. */
  onSave: () => Promise<string> | string;
  /** A „Visszaállítás" akciója (gyári értékek). */
  onReset: () => void;
  resetLabel?: string;
}

/**
 * Egységes „Mentés fájlba / Visszaállítás" sáv (0.4) — minden szerkeszthető lap
 * a Vissza gomb alatt / a lap alján ezt használja.
 */
export function saveBar(o: SaveBarOpts): HTMLElement {
  const status = el('span', { class: 'adm-savebar-status' });
  const save = button('💾 Mentés fájlba', async () => {
    status.textContent = 'Mentés…';
    try {
      status.textContent = await o.onSave();
    } catch (e) {
      status.textContent = `Hiba: ${String(e)}`;
    }
  }, 'primary');
  const reset = button(o.resetLabel ?? '↺ Visszaállítás', () => {
    o.onReset();
    status.textContent = 'Visszaállítva a gyári értékekre.';
  });
  return el('div', { class: 'adm-savebar' }, [save, reset, status]);
}
