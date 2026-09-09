const toDataUrl = (svg) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const frame = (accent, accentSoft, symbol, selected = false) => toDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="pin" x1="20" y1="10" x2="105" y2="116" gradientUnits="userSpaceOnUse">
      <stop stop-color="#292333"/><stop offset="0.48" stop-color="#100d17"/><stop offset="1" stop-color="#050408"/>
    </linearGradient>
    <linearGradient id="rim" x1="24" y1="16" x2="103" y2="105" gradientUnits="userSpaceOnUse">
      <stop stop-color="${accentSoft}"/><stop offset="0.38" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity=".68"/>
    </linearGradient>
    <filter id="glow" x="-45%" y="-38%" width="190%" height="195%">
      <feGaussianBlur stdDeviation="${selected ? 7 : 4.5}" result="blur"/><feFlood flood-color="${accent}" flood-opacity="${selected ? .95 : .72}"/><feComposite in2="blur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="symbolGlow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <path d="M64 5C33 5 11 27 11 56c0 28 22 47 53 68 31-21 53-40 53-68C117 27 95 5 64 5Z" fill="none" stroke="${accent}" stroke-width="${selected ? 10 : 8}" opacity=".24" filter="url(#glow)"/>
  <path d="M64 5C33 5 11 27 11 56c0 28 22 47 53 68 31-21 53-40 53-68C117 27 95 5 64 5Z" fill="url(#pin)" stroke="url(#rim)" stroke-width="${selected ? 8 : 7}" stroke-linejoin="round"/>
  <path d="M31 34C39 19 53 14 68 14" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/>
  <path d="M38 93c8 8 17 15 26 21 9-6 18-13 26-21" fill="none" stroke="${accentSoft}" stroke-opacity=".2" stroke-width="3" stroke-linecap="round"/>
  <g filter="url(#symbolGlow)">${symbol}</g>
</svg>`);

const pumpkin = `<path d="M64 30c-20 0-33 12-33 29s13 28 33 28 33-11 33-28S84 30 64 30Z" fill="#f47b16" stroke="#7c2d12" stroke-width="3"/><path d="M64 31c-7 0-12 12-12 27s5 27 12 27 12-12 12-27-5-27-12-27Z" fill="#fb923c" opacity=".72"/><path d="M61 30c0-8 4-13 13-15-2 5-1 9 3 13" fill="none" stroke="#65a30d" stroke-width="6" stroke-linecap="round"/><path d="m44 50 9 8H37l7-8Zm40 0 7 8H75l9-8ZM42 70c13 11 31 11 44 0l-7-1-5 6-10-4-10 4-5-6-7 1Z" fill="#ffe16a" stroke="#9a3412" stroke-width="2"/>`;
const ghost = `<path d="M37 87V53c0-19 11-31 27-31s27 12 27 31v34L78 76 64 88 50 76 37 87Z" fill="#f8fafc" stroke="#c4b5fd" stroke-width="3"/><path d="M48 45c7-13 22-17 34-7" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/><ellipse cx="54" cy="55" rx="4" ry="6" fill="#2e1065"/><ellipse cx="75" cy="55" rx="4" ry="6" fill="#2e1065"/><path d="M55 69c6 5 13 5 19 0" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>`;
const house = `<circle cx="67" cy="46" r="31" fill="#84cc16" opacity=".22"/><path d="m27 53 14-13V27l10 7 13-15 12 14 10-7v15l15 13-7 3v31H34V57l-7-4Z" fill="#070a08" stroke="#86efac" stroke-width="3" stroke-linejoin="round"/><path d="M43 53h10v12H43zm30-15h10v12H73zm10 25h10v12H83z" fill="#d9f99d" stroke="#4d7c0f" stroke-width="2"/><path d="M58 88V64h13v24" fill="#17211a" stroke="#4ade80" stroke-width="2"/><path d="M30 88h69" stroke="#bbf7d0" stroke-width="3" stroke-linecap="round"/>`;
const candy = `<path d="m28 46 18 8v22l-18 9 5-20-5-19Zm72 0-18 8v22l18 9-5-20 5-19Z" fill="#facc15" stroke="#a16207" stroke-width="3"/><rect x="43" y="50" width="42" height="31" rx="10" fill="#fb923c" stroke="#fed7aa" stroke-width="3"/><path d="m50 55 27 21M46 68l17 12M64 51l19 16" stroke="#fff7ed" stroke-width="4" opacity=".78"/>`;
const car = `<path d="M27 65h74l-8-25H42L27 65Z" fill="#0f172a" stroke="#67e8f9" stroke-width="4" stroke-linejoin="round"/><path d="M38 65h52l-5-16H47l-9 16Z" fill="#164e63"/><path d="M33 65v17h62V65" fill="#172033" stroke="#22d3ee" stroke-width="3"/><circle cx="45" cy="82" r="7" fill="#030712" stroke="#a5f3fc" stroke-width="3"/><circle cx="83" cy="82" r="7" fill="#030712" stroke="#a5f3fc" stroke-width="3"/><path d="m51 58 7 5 7-5 7 5 7-5" fill="none" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>`;
const lights = `<path d="M64 22v13M34 32l10 11M94 32 84 43M25 61h15m48 0h15" stroke="#fef08a" stroke-width="5" stroke-linecap="round"/><path d="m64 38 8 16 18 3-13 12 3 18-16-8-16 8 3-18-13-12 18-3 8-16Z" fill="#facc15" stroke="#fff7ae" stroke-width="3"/><circle cx="64" cy="62" r="8" fill="#fffde7"/>`;
const witch = `<path d="m35 73 25-42c4-8 9-12 19-15-3 10 1 16 12 22L76 55l13 18H35Z" fill="#6d28d9" stroke="#c4b5fd" stroke-width="3" stroke-linejoin="round"/><path d="M45 57h36l8 16H35l10-16Z" fill="#2e1065"/><path d="M43 59h40" stroke="#f59e0b" stroke-width="6"/><path d="M29 76c21 8 49 8 70 0-5 11-65 11-70 0Z" fill="#8b5cf6" stroke="#ddd6fe" stroke-width="3"/>`;
const cauldron = `<path d="M34 48c3-13 56-13 60 0v8c0 4-3 8-7 9l-5 20H46l-5-20c-4-1-7-5-7-9v-8Z" fill="#101a16" stroke="#86efac" stroke-width="3"/><ellipse cx="64" cy="49" rx="30" ry="10" fill="#a3e635" stroke="#d9f99d" stroke-width="3"/><circle cx="49" cy="43" r="5" fill="#d9f99d"/><circle cx="70" cy="36" r="6" fill="#bef264"/><circle cx="82" cy="43" r="4" fill="#ecfccb"/><path d="M47 85 40 92m41-7 7 7" stroke="#86efac" stroke-width="5" stroke-linecap="round"/><path d="M53 32c-6-7 3-10-1-17m23 15c7-8-2-11 3-18" fill="none" stroke="#d9f99d" stroke-width="3" stroke-linecap="round" opacity=".75"/>`;
const noCandy = `<path d="m34 48 14 7v19l-14 7 4-16-4-17Zm60 0-14 7v19l14 7-4-16 4-17Z" fill="#f8fafc" stroke="#fecaca" stroke-width="3"/><rect x="47" y="52" width="34" height="26" rx="7" fill="#f8fafc" stroke="#fecaca" stroke-width="3"/><circle cx="64" cy="64" r="37" fill="none" stroke="#ef4444" stroke-width="8"/><path d="m38 38 52 52" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>`;
const tombstone = `<path d="M40 87V48c0-15 10-25 24-25s24 10 24 25v39H40Z" fill="#cbd5e1" stroke="#f8fafc" stroke-width="3"/><path d="M46 48c2-11 9-17 19-17" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".65"/><text x="64" y="66" text-anchor="middle" fill="#334155" font-family="Georgia,serif" font-size="20" font-weight="900">RIP</text><path d="M32 88h64M48 76h32" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>`;
const star = `<path d="m64 22 12 24 27 4-20 19 5 27-24-13-24 13 5-27-20-19 27-4 12-24Z" fill="#facc15" stroke="#fef9c3" stroke-width="3"/><path d="M51 48c8-12 18-16 28-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;

const buildFamily = (selected = false) => ({
  halloween_decorations: frame("#f97316", "#fdba74", pumpkin, selected),
  haunted: frame("#65a30d", "#bef264", house, selected),
  trick_or_treat: frame("#f59e0b", "#fde68a", candy, selected),
  trunk_or_treat: frame("#06b6d4", "#a5f3fc", car, selected),
  scary_yard: frame("#8b5cf6", "#ddd6fe", ghost, selected),
  light_show: frame("#eab308", "#fef9c3", lights, selected),
  kid_friendly: frame("#a855f7", "#e9d5ff", ghost, selected),
  no_candy_here: frame("#ef4444", "#fecaca", noCandy, selected),
  must_see: frame("#f59e0b", "#fef3c7", star, selected),
  halloween_event: frame("#7c3aed", "#ddd6fe", witch, selected),
  witch: frame("#7c3aed", "#ddd6fe", witch, selected),
  cauldron: frame("#84cc16", "#d9f99d", cauldron, selected),
  tombstone: frame("#94a3b8", "#f8fafc", tombstone, selected),
  spooky_yard: frame("#8b5cf6", "#ddd6fe", ghost, selected),
});

export const HALLOWEEN_AD_DEMO_ICONS = buildFamily(false);
export const HALLOWEEN_SELECTED_ICON_ASSETS = buildFamily(true);