# PROMPT para Claude Code — Combinación Indigo + Sage en SIAGRD/SATAM

> Pega esto directamente en Claude Code. Es autocontenido — no requiere contexto adicional.
> Combinación: 🔷 Indigo Pro (estructura) + 🌿 Sage & Forest (contenido/cards)

---

## CONTEXTO

Estás trabajando en **SIAGRD Meta / SATAM** — sistema de gestión de riesgo y desastres del departamento del Meta, Colombia. Monorepo pnpm con:
- Panel web: `apps/panel-web` (Next.js 14 App Router + Tailwind CSS)
- App ciudadano: `apps/ciudadano` (React Native + Expo)

**Tarea:** aplicar la combinación de diseño **Indigo Pro + Sage & Forest** a todo el sistema. Esta es la paleta oficial definitiva.

---

## TOKENS OFICIALES

### Paleta Estructura — Indigo Pro (sidebar, nav, botones primarios)

```
page-bg:           #eef2ff
sidebar-bg:        #ffffff
bar-bg:            #ffffff
bar-border:        #c7d2fe
brand-text:        #312e81

active-bg:         #e0e7ff
active-text:       #312e81
active-border:     #4f46e5
nav-text:          #475569
nav-hover-bg:      rgba(79,70,229,0.06)
nav-hover-text:    #4f46e5

btn-primary-bg:    #4f46e5    btn-primary-text:  #ffffff
btn-primary-hover: #4338ca
btn-second-bg:     #e0e7ff    btn-second-text:   #312e81
btn-ghost-text:    #4f46e5    btn-ghost-border:  #c7d2fe
btn-danger-bg:     #fee2e2    btn-danger-text:   #991b1b

border:            #c7d2fe
text-main:         #0f0a2e
text-muted:        #6b7280

tab-active:        #4f46e5
tab-inactive:      #94a3b8
tab-bg:            #ffffff
tab-border:        #c7d2fe
```

### Paleta Contenido — Sage & Forest (cards KPI, secciones de contenido)

```
card-1-bg:         #dcfce7    card-1-text: #14532d   (principal / positivo)
card-2-bg:         #ecfccb    card-2-text: #365314   (secundario)
card-3-bg:         #fef9c3    card-3-text: #854d0e   (advertencia/campo)

app-search-bg:     #dcfce7
section-bg:        #f0fdf4    (fondos de sección secundaria en web)
```

### Badges de estado — UNIVERSALES (no cambian)

```
badge-success:  bg #dcfce7 / text #14532d
badge-warning:  bg #fef9c3 / text #854d0e
badge-danger:   bg #fee2e2 / text #991b1b
badge-info:     bg #e0e7ff / text #312e81
```

### Niveles de alerta SATAM (TopBar badge)

```
VERDE:    bg #dcfce7 / text #14532d / border #86efac
AMARILLO: bg #fef9c3 / text #713f12 / border #fde047
NARANJA:  bg #ffedd5 / text #7c2d12 / border #fdba74
ROJO:     bg #fee2e2 / text #7f1d1d / border #fca5a5
```

---

## ARCHIVOS A MODIFICAR — PANEL WEB

### 1. `apps/panel-web/src/components/Sidebar.tsx`

Reescribir usando **inline styles** (NO clases Tailwind custom). Requisitos:

```tsx
// Aside wrapper
style={{ backgroundColor: '#ffffff' }}
className="fixed left-0 top-14 bottom-0 w-64 flex flex-col z-40 overflow-y-auto
           transition-transform duration-200 md:translate-x-0
           [open ? translate-x-0 : -translate-x-full]"

// Section labels (OPERACIONES, ORGANIZACIONES, ADMINISTRACIÓN)
style={{ color: 'rgba(71,85,105,0.5)' }}

// Ítem de navegación INACTIVO
style={{ color: '#475569' }}
onMouseEnter → style={{ backgroundColor: 'rgba(79,70,229,0.06)', color: '#4f46e5' }}
onMouseLeave → restaurar

// Ítem de navegación ACTIVO
style={{
  backgroundColor: '#e0e7ff',
  color: '#312e81',
  borderLeft: '3px solid #4f46e5',
  paddingLeft: '8px',
}}

// Footer border
style={{ borderTop: '1px solid #c7d2fe' }}

// Badge de rol del usuario
style={{ backgroundColor: 'rgba(79,70,229,0.15)', color: '#4f46e5' }}

// Botón logout hover
onMouseEnter → style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
```

### 2. `apps/panel-web/src/components/TopBar.tsx`

```tsx
// Header
<header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #c7d2fe' }}
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3 shadow-sm">

// Logo SATAM
<span className="font-bold text-lg tracking-wide" style={{ color: '#312e81' }}>SATAM</span>

// NIVEL_STYLES como React.CSSProperties (NO string de clases Tailwind)
const NIVEL_STYLES: Record<string, React.CSSProperties> = {
  VERDE:    { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' },
  AMARILLO: { backgroundColor: '#fef9c3', color: '#713f12', borderColor: '#fde047' },
  NARANJA:  { backgroundColor: '#ffedd5', color: '#7c2d12', borderColor: '#fdba74' },
  ROJO:     { backgroundColor: '#fee2e2', color: '#7f1d1d', borderColor: '#fca5a5' },
};

// Uso del estilo (con spread + border explícito):
<span
  style={{ ...nivelStyle, border: `1px solid ${nivelStyle.borderColor}` }}
  className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
>

// Icono campana y reloj
className="text-gray-500"  // estándar Tailwind — OK

// Badge de notificaciones
className="bg-red-500 text-white"  // estándar Tailwind — OK
```

### 3. `apps/panel-web/src/components/DashboardShell.tsx`

```tsx
// Wrapper principal — SOLO este cambio:
<div style={{ backgroundColor: '#eef2ff' }}
     className="flex h-screen overflow-hidden font-sans">
```

### 4. `apps/panel-web/src/app/(auth)/login/page.tsx`

```tsx
// Fondo de página
<div style={{ backgroundColor: '#eef2ff' }}
     className="min-h-screen flex flex-col items-center justify-center p-4">

// Card login
<div style={{
       backgroundColor: '#ffffff',
       borderRadius: '1rem',
       boxShadow: '0 8px 32px rgba(79,70,229,0.12)',
     }}
     className="p-8 w-full max-w-md">

// Ícono escudo
<div style={{ backgroundColor: '#e0e7ff' }}
     className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4">

// Título SATAM
<h1 style={{ color: '#312e81' }} className="text-3xl font-bold tracking-wide">SATAM</h1>

// Botón submit
<button style={{ backgroundColor: '#4f46e5' }}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-2
                   hover:opacity-90 disabled:opacity-50
                   text-white font-semibold rounded-lg transition-opacity">
```

### 5. `apps/panel-web/src/app/(dashboard)/page.tsx`

Buscar y actualizar los KPI cards principales. Aplicar:

```tsx
// Card 1 — principal (incidentes activos, alertas activas, etc.)
style={{ backgroundColor: '#dcfce7', color: '#14532d' }}

// Card 2 — secundaria
style={{ backgroundColor: '#ecfccb', color: '#365314' }}

// Card 3 — advertencia / campo
style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}

// Card peligro / crítica
style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}

// Botón de acción flotante (si existe)
style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
```

### 6. `apps/panel-web/tailwind.config.ts`

Agregar en `extend.colors` para uso futuro con clases Tailwind estándar:

```ts
extend: {
  colors: {
    brand: {
      DEFAULT:  '#4f46e5',
      light:    '#e0e7ff',
      lighter:  '#eef2ff',
      dark:     '#312e81',
      darker:   '#1e1b4b',
      border:   '#c7d2fe',
    },
    sage: {
      DEFAULT:  '#16a34a',
      light:    '#dcfce7',
      lighter:  '#ecfccb',
      dark:     '#14532d',
      darker:   '#365314',
    },
  },
},
```

---

## ARCHIVOS A MODIFICAR — APP CIUDADANO

### 7. `apps/ciudadano/src/constants/colors.ts` (crear si no existe)

```ts
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
```

### 8. Bottom tab bar de la app

Buscar el componente de tabs (puede llamarse `BottomTabBar.tsx`, `TabNavigator.tsx`, o estar en el navigator de Expo Router):

```tsx
// Tab activo
color: COLORS.tabActive         // #4f46e5

// Tab inactivo
color: COLORS.tabInactive       // #94a3b8

// Fondo del tab bar
backgroundColor: COLORS.tabBg  // #ffffff
borderTopColor: COLORS.tabBorder // #c7d2fe
borderTopWidth: 1
```

### 9. Pantallas principales de la app

En cada pantalla con header o fondo de página:

```tsx
// SafeAreaView o View raíz
style={{ backgroundColor: COLORS.pageBg }}   // #eef2ff

// Header de pantalla
style={{ backgroundColor: COLORS.headerBg }} // #ffffff

// Barra de búsqueda
style={{ backgroundColor: COLORS.searchBg }} // #dcfce7

// Cards de resumen
style={{ backgroundColor: COLORS.card1Bg, ... }}

// Botón principal de acción (Reportar, Enviar, etc.)
style={{ backgroundColor: COLORS.btnPrimaryBg, ... }}
// texto: color: COLORS.btnPrimaryText (#ffffff)
```

---

## RESTRICCIONES CRÍTICAS

1. **NUNCA** usar `bg-sidebar-bg`, `bg-panel-bg`, `text-sidebar-muted` u otros tokens custom sin definición en `tailwind.config.ts`. Produce CSS vacío.
2. **NUNCA** fondos oscuros en sidebar, header o páginas. El sidebar web va en blanco.
3. Al escribir archivos `.tsx` con el Write tool: usar `python3 << 'PYEOF'` heredoc para evitar truncamiento por caracteres especiales.
4. Después de modificar cualquier archivo: correr `node ../../node_modules/typescript/bin/tsc --noEmit` desde `apps/panel-web`. Debe arrojar **0 errores**.
5. Todo el trabajo va en rama `feat/diseno-indigo-sage`. Nunca push directo a `main`.

---

## ORDEN DE EJECUCIÓN

```
1.  Crear apps/ciudadano/src/constants/colors.ts
2.  Modificar Sidebar.tsx
3.  Modificar TopBar.tsx
4.  Modificar DashboardShell.tsx
5.  Modificar login/page.tsx
6.  Actualizar apps/panel-web/tailwind.config.ts (agregar brand + sage)
7.  Revisar y ajustar page.tsx del dashboard (KPI cards)
8.  Actualizar tab bar y pantallas principales en apps/ciudadano
9.  Correr: cd apps/panel-web && node ../../node_modules/typescript/bin/tsc --noEmit
    → debe dar 0 errores antes de continuar
10. Commit: feat: aplicar combinación Indigo+Sage al panel web y app ciudadano
```

---

## CHECKLIST DE VERIFICACIÓN

Antes del commit, confirmar visualmente y por código:

- [ ] Sidebar: fondo `#ffffff`, ítem activo `#e0e7ff` / `#312e81`, borde `#4f46e5`
- [ ] TopBar: fondo `#ffffff`, borde `#c7d2fe`, logo SATAM en `#312e81`
- [ ] Dashboard: fondo `#eef2ff`, KPIs en verde salvia (`#dcfce7`, `#ecfccb`)
- [ ] Login: fondo `#eef2ff`, card blanca, sombra índigo suave, botón `#4f46e5`
- [ ] App: header `#ffffff`, fondo `#eef2ff`, search `#dcfce7`, tab activo `#4f46e5`
- [ ] Niveles alerta SATAM: VERDE/AMARILLO/NARANJA/ROJO con hex correctos
- [ ] `tsc --noEmit` = 0 errores
- [ ] Sin clases Tailwind custom sin definir en config
- [ ] Rama `feat/diseno-indigo-sage` creada, no tocado `main`
