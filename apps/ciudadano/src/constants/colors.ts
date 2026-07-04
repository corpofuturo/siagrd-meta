/**
 * SATAM — Paleta oficial: Indigo Pro (estructura) + Sage & Forest (contenido)
 * Actualizado: julio 2026
 */
export const COLORS = {
  // === ESTRUCTURA (Indigo Pro) ===
  pageBg:          '#eef2ff',
  headerBg:        '#ffffff',
  sidebarBg:       '#ffffff',

  primary:         '#4f46e5',
  primaryLight:    '#e0e7ff',
  primaryDark:     '#312e81',
  primaryHover:    '#4338ca',

  activeItemBg:    '#e0e7ff',
  activeItemText:  '#312e81',
  activeItemBorder:'#4f46e5',
  navText:         '#475569',
  navHoverBg:      'rgba(79,70,229,0.06)',

  border:          '#c7d2fe',
  textMain:        '#0f0a2e',
  textMuted:       '#6b7280',

  tabActive:       '#4f46e5',
  tabInactive:     '#94a3b8',
  tabBg:           '#ffffff',
  tabBorder:       '#c7d2fe',

  // === CONTENIDO (Sage & Forest) ===
  searchBg:        '#dcfce7',

  card1Bg:         '#dcfce7',  card1Text: '#14532d',
  card2Bg:         '#ecfccb',  card2Text: '#365314',
  card3Bg:         '#fef9c3',  card3Text: '#854d0e',

  // === ESTADOS UNIVERSALES ===
  successBg:       '#dcfce7',  successText: '#14532d',
  warningBg:       '#fef9c3',  warningText: '#854d0e',
  dangerBg:        '#fee2e2',  dangerText:  '#991b1b',
  infoBg:          '#e0e7ff',  infoText:    '#312e81',

  // === BOTONES ===
  btnPrimaryBg:    '#4f46e5',  btnPrimaryText: '#ffffff',
  btnSecondBg:     '#e0e7ff',  btnSecondText:  '#312e81',
  btnDangerBg:     '#fee2e2',  btnDangerText:  '#991b1b',
} as const;

export type ColorKey = keyof typeof COLORS;
