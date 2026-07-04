export const colors = {
  bg: {
    primary:   '#eef2ff',
    secondary: '#ffffff',
    tertiary:  '#dcfce7',
    overlay:   'rgba(15,10,46,0.6)',
  },
  surface: { default: '#ffffff', elevated: '#ffffff', pressed: '#e0e7ff' },
  text: {
    primary:  '#0f0a2e',
    secondary: '#6b7280',
    disabled:  '#94a3b8',
    inverse:   '#ffffff',
  },
  border: { default: '#c7d2fe', strong: '#a5b4fc', focus: '#4f46e5' },
  alerta: {
    verde:   { bg:'#052E16', surface:'#14532D', text:'#86EFAC', solid:'#16A34A', icon:'#4ADE80' },
    amarillo:{ bg:'#1C1700', surface:'#422006', text:'#FDE68A', solid:'#D97706', icon:'#FBBF24' },
    naranja: { bg:'#1C0A00', surface:'#431407', text:'#FDBA74', solid:'#EA580C', icon:'#F97316' },
    rojo:    { bg:'#1C0505', surface:'#450A0A', text:'#FCA5A5', solid:'#DC2626', icon:'#EF4444', pulse:'#FF0000' },
  },
  amenaza: {
    INUNDACION:       '#2563EB',
    REMOCION:         '#92400E',
    SISMO:            '#7C3AED',
    INCENDIO_FORESTAL:'#DC2626',
    ACCIDENTE_VIA:    '#D97706',
    DERRAME_HC:       '#374151',
    OTRO:             '#6B7280',
  },
  action: {
    primary:       '#2563EB',
    primary_hover: '#1D4ED8',
    danger:        '#DC2626',
    danger_hover:  '#B91C1C',
    success:       '#16A34A',
    warning:       '#D97706',
  },
  recurso: {
    disponible:    '#16A34A',
    ocupado:       '#D97706',
    fuera_servicio:'#DC2626',
    sin_datos:     '#6B7280',
  },
} as const;

export const typography = {
  family: { display: 'BarlowCondensed', body: 'IBMPlexSans', mono: 'IBMPlexMono' },
  size: { xs:11, sm:13, base:15, md:17, lg:20, xl:24, '2xl':30, '3xl':36, '4xl':48 },
  weight: { regular:'400', medium:'500', semibold:'600', bold:'700' },
} as const;

export const spacing = { 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 8:32, 10:40, 12:48, 16:64 } as const;
export const radius = { sm:4, md:8, lg:12, xl:16, full:9999 } as const;

export const touch = { min:44, standard:56, emergency:72 } as const;

export const animation = {
  fast: 150, normal: 250, slow: 400,
  pulse_emergency: { duration: 800, easing: 'ease-in-out' },
} as const;
