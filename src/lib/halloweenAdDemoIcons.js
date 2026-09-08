const toDataUrl = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const frame = (label, accent, symbol) => toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path d="M64 5c31 0 56 23 56 52 0 20-11 36-29 46L64 122l-27-19C19 93 8 77 8 57 8 28 33 5 64 5Z" fill="#171022" stroke="${accent}" stroke-width="7"/><g fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${symbol}</g><rect x="13" y="88" width="102" height="25" rx="12" fill="${accent}"/><text x="64" y="105" text-anchor="middle" fill="#171022" font-family="Arial,sans-serif" font-size="12" font-weight="900">${label}</text></svg>`);

const pumpkin = '<path d="M64 27c-20 0-34 11-34 28s14 28 34 28 34-11 34-28-14-28-34-28Z"/><path d="M64 27c0-8 5-12 12-13M47 48l8 7H40l7-7Zm34 0 7 7H73l8-7ZM45 67c12 8 26 8 38 0"/>';
const house = '<path d="M31 54 64 25l33 29M40 49v34h48V49M55 83V64h18v19M48 58h8m16 0h8"/>';
const candy = '<path d="m31 45 15 7v22l-15 7 4-18-4-18Zm66 0-15 7v22l15 7-4-18 4-18ZM46 52h36v22H46z"/>';
const car = '<path d="M28 65h72l-7-22H42l-14 22Zm8 0v15m56-15v15M44 80h-8m56 0h-8M48 53h36"/>';
const skull = '<path d="M39 56c0-17 11-28 25-28s25 11 25 28c0 11-5 18-13 22v8H52v-8c-8-4-13-11-13-22Z"/><path d="M50 56h4m20 0h4M58 70h12M58 86v-8m12 8v-8"/>';
const lights = '<path d="M64 23v12M36 34l9 9M92 34l-9 9M28 62h13m46 0h13M64 42l7 13 14 2-10 10 3 14-14-7-14 7 3-14-10-10 14-2 7-13Z"/>';
const ghost = '<path d="M40 82V52c0-17 10-27 24-27s24 10 24 27v30L76 72 64 82 52 72 40 82Z"/><path d="M53 52h2m18 0h2M55 64c6 5 12 5 18 0"/>';
const noCandy = '<circle cx="64" cy="58" r="34"/><path d="m40 34 48 48M43 50l11 5v16l-11 5 3-13-3-13Zm42 0-11 5v16l11 5-3-13 3-13M54 55h20v16H54"/>';
const star = '<path d="m64 24 11 22 25 4-18 17 4 25-22-12-22 12 4-25-18-17 25-4 11-22Z"/>';

export const HALLOWEEN_AD_DEMO_ICONS = {
  halloween_decorations: frame("DECORATIONS", "#f97316", pumpkin),
  haunted: frame("HAUNTED", "#a78bfa", house),
  trick_or_treat: frame("TRICK OR TREAT", "#fbbf24", candy),
  trunk_or_treat: frame("TRUNK OR TREAT", "#22d3ee", car),
  scary_yard: frame("SCARY YARD", "#ef4444", skull),
  light_show: frame("LIGHT SHOW", "#fde047", lights),
  kid_friendly: frame("KID FRIENDLY", "#4ade80", ghost),
  no_candy_here: frame("NO CANDY", "#fb7185", noCandy),
  must_see: frame("MUST SEE", "#facc15", star),
};