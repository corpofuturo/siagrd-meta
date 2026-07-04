# PROMPT para Claude Code — Aplicar Paleta Indigo Pro a SIAGRD

> Pega esto directamente en Claude Code (terminal o chat). Es autocontenido y no requiere contexto adicional.

---

## PROMPT

Aplica la paleta de diseño **Indigo Pro** a todo el panel web (`apps/panel-web`) y la app ciudadano (`apps/ciudadano`) de SIAGRD. Esta es la paleta oficial del sistema. Sigue EXACTAMENTE las instrucciones de abajo sin desviarte.

### TOKENS OFICIALES — INDIGO PRO

```
page-bg:           #eef2ff   (fondo de páginas y contenido)
sidebar-bg:        #ffffff   (fondo del sidebar)
active-bg:         #e0e7ff   (ítem activo en sidebar/nav)
active-text:       #312e81   (texto del ítem activo)
active-border:     #4f46e5   (borde izquierdo del ítem activo)
nav-text:          #475569   (texto de ítems inactivos en nav)

btn-primary-bg:    #4f46e5   btn-primary-text: #ffffff
btn-second-bg:     #e0e7ff   btn-second-text:  #312e81
btn-ghost-text:    #4f46e5   btn-ghost-border: #c7d2fe
btn-danger-bg:     #fee2e2   btn-danger-text:  #991b1b

card-1-bg:         #e0e7ff   card-1-text: #312e81
card-2-bg:         #ede9fe   card-2-text: #4c1d95
card-3-bg:         #fce7f3   card-3-text: #831843

badge-success-bg:  #dcfce7   badge-success-text: #14532d
badge-warning-bg:  #fef9c3   badge-warning-text: #854d0e
badge-danger-bg:   #fee2e2   badge-danger-text:  #991b1b
badge-info-bg:     #e0e7ff   badge-info-text:    #312e81

text-main:         #0f0a2e
text-muted:        #6b7280
border-color:      #c7d2fe

app-header-bg:     #ffffff
app-search-bg:     #e0e7ff
tab-active:        #4f46e5
tab-inactive:      #94a3b8
```

---

### ARCHIVOS A MODIFICAR — PANEL WEB (`apps/panel-web`)

#### 1. `apps/panel-web/src/components/Sidebar.tsx`

Aplica los tokens al sidebar usando **inline styles** (NO clases Tailwind custom). El sidebar debe:
- Fondo: `backgroundColor: '#ffffff'`
- Ítem activo: `backgroundColor: '#e0e7ff'`, `color: '#312e81'`, `borderLeft: '3px solid #4f46e5'`
- Hover ítem inactivo: `backgroundColor: 'rgba(79,70,229,0.06)'`, `color: '#4f46e5'`
- Texto ítems inactivos: `color: '#475569'`
- Sección labels (OPERACIONES, ORGANIZACIONES, etc.): `color: 'rgba(71,85,105,0.5)'`
- Footer border: `borderTop: '1px solid #c7d2fe'`
- Badge de rol usuario: `backgroundColor: 'rgba(79,70,229,0.15)'`, `color: '#4f46e5'`
- Botón logout hover: `backgroundColor: 'rgba(239,68,68,0.1)'`, `color: '#ef4444'`

#### 2. `apps/panel-web/src/components/TopBar.tsx`

- Header: `backgroundColor: '#ffffff'`, `borderBottom: '1px solid #c7d2fe'`
- Logo SATAM: `color: '#312e81'`
- Badges de nivel de alerta (NIVEL_STYLES) como `React.CSSProperties`:
  ```ts
  VERDE:    { backgroundColor: '#dcfce7', color: '#14532d', borderColor: '#86efac' }
  AMARILLO: { backgroundColor: '#fef9c3', color: '#713f12', borderColor: '#fde047' }
  NARANJA:  { backgroundColor: '#ffedd5', color: '#7c2d12', borderColor: '#fdba74' }
  ROJO:     { backgroundColor: '#fee2e2', color: '#7f1d1d', borderColor: '#fca5a5' }
  ```
- Ícono de campana y reloj: `color: '#475569'`
- Badge de notificaciones: `backgroundColor: '#ef4444'`, `color: '#ffffff'`

#### 3. `apps/panel-web/src/components/DashboardShell.tsx`

- Wrapper principal: `className="flex h-screen overflow-hidden font-sans"` con `style={{ backgroundColor: '#eef2ff' }}`
- Overlay mobile: `bg-black/60` (sin cambios)
- `<main>`: sin cambio en clases, el fondo viene del wrapper

#### 4. `apps/panel-web/src/app/(auth)/login/page.tsx`

- Fondo página: `style={{ backgroundColor: '#eef2ff' }}`
- Card login: `backgroundColor: '#ffffff'`, `borderRadius: '1rem'`, `boxShadow: '0 8px 32px rgba(79,70,229,0.12)'`
- Ícono escudo wrapper: `backgroundColor: '#e0e7ff'`
- Título SATAM: `color: '#312e81'`
- Subtítulo: `color: '#6b7280'`
- Inputs focus: `ring-indigo-500 border-indigo-500` (ya son clases Tailwind estándar)
- Botón submit: `backgroundColor: '#4f46e5'` hover `#4338ca`, texto `#ffffff`

#### 5. `apps/panel-web/src/app/(dashboard)/page.tsx` (Dashboard principal)

Los KPI cards que existan deben usar:
- Card primaria: `backgroundColor: '#e0e7ff'`, `color: '#312e81'`
- Card secundaria: `backgroundColor: '#ede9fe'`, `color: '#4c1d95'`
- Card alerta/danger: `backgroundColor: '#fee2e2'`, `color: '#991b1b'`
- Card éxito: `backgroundColor: '#dcfce7'`, `color: '#14532d'`

Botón de acción flotante (si existe): `backgroundColor: '#4f46e5'`, `color: '#ffffff'`

#### 6. `apps/panel-web/tailwind.config.ts`

Agrega esta sección `extend.colors` para que los colores estén disponibles como clases Tailwind también (opcional pero recomendado para componentes futuros):

```ts
extend: {
  colors: {
    indigo: {
      // Tailwind ya tiene indigo, no redefinir
    },
    brand: {
      DEFAULT:  '#4f46e5',
      light:    '#e0e7ff',
      lighter:  '#eef2ff',
      dark:     '#312e81',
      darker:   '#1e1b4b',
      border:   '#c7d2fe',
    },
  },
}
```

---

### ARCHIVOS A MODIFICAR — APP CIUDADANO (`apps/ciudadano`)

#### 7. `apps/ciudadano/src/constants/colors.ts` (crear si no existe)

```ts
// Paleta Indigo Pro — SIAGRD
export const COLORS = {
  // Fondos
  pageBg:       '#eef2ff',
  cardBg:       '#ffffff',
  headerBg:     '#ffffff',
  searchBg:     '#e0e7ff',

  // Primarios
  primary:      '#4f46e5',
  primaryLight: '#e0e7ff',
  primaryDark:  '#312e81',

  // Secundario
  secondary:    '#7c3aed',
  secondaryLight:'#ede9fe',

  // Cards
  card1Bg:      '#e0e7ff', card1Text: '#312e81',
  card2Bg:      '#ede9fe', card2Text: '#4c1d95',
  card3Bg:      '#fce7f3', card3Text: '#831843',

  // Estados/Badges
  successBg:    '#dcfce7', successText: '#14532d',
  warningBg:    '#fef9c3', warningText: '#854d0e',
  dangerBg:     '#fee2e2', dangerText:  '#991b1b',
  infoBg:       '#e0e7ff', infoText:    '#312e81',

  // Texto
  textMain:     '#0f0a2e',
  textMuted:    '#6b7280',
  border:       '#c7d2fe',

  // Tabs
  tabActive:    '#4f46e5',
  tabInactive:  '#94a3b8',
  tabBg:        '#ffffff',
} as const;
```

#### 8. `apps/ciudadano/src/components/BottomTabBar.tsx` (o el archivo de tabs que exista)

- Tab activo: `color: COLORS.tabActive` (`#4f46e5`)
- Tab inactivo: `color: COLORS.tabInactive` (`#94a3b8`)
- Fondo tab bar: `backgroundColor: COLORS.tabBg` (`#ffffff`), `borderTopColor: '#c7d2fe'`

#### 9. Pantallas principales de la app

En cada pantalla que tenga un header o fondo de página:
- `backgroundColor: COLORS.pageBg` (`#eef2ff`) para el fondo general
- Header: `backgroundColor: COLORS.headerBg` (`#ffffff`)
- Cards de resumen: usar `card1Bg/card1Text`, `card2Bg/card2Text`
- Botón principal de acción: `backgroundColor: COLORS.primary`, `color: '#ffffff'`

---

### RESTRICCIONES IMPORTANTES

1. **NUNCA** usar fondos oscuros (`#1e3a5f`, `#1e293b`, etc.) en páginas, sidebar o header de este proyecto desde ahora. El sidebar es blanco con acento índigo pastel.
2. **NUNCA** escribir clases Tailwind custom que no estén definidas en `tailwind.config.ts` (evitar `bg-sidebar-bg`, `bg-panel-bg`, `text-sidebar-muted`, etc.).
3. Usar siempre `style={{ }}` inline para colores de layout principal (sidebar, topbar, page-bg). Para cards y badges internos, las clases Tailwind estándar equivalentes son aceptables (`bg-indigo-100`, `text-indigo-900`, etc.).
4. Al escribir archivos `.tsx` con el Write tool, usar siempre `python3 << 'PYEOF'` heredoc para evitar truncamiento.
5. Después de cada archivo modificado, correr `node ../../node_modules/typescript/bin/tsc --noEmit` desde `apps/panel-web` para verificar 0 errores TypeScript.
6. Hacer commits en rama `feat/paleta-indigo-pro`, nunca directo a `main`.

---

### ORDEN DE EJECUCIÓN

1. Crear `apps/ciudadano/src/constants/colors.ts`
2. Modificar `Sidebar.tsx`
3. Modificar `TopBar.tsx`
4. Modificar `DashboardShell.tsx`
5. Modificar `login/page.tsx`
6. Modificar `apps/panel-web/tailwind.config.ts` (agregar `brand`)
7. Revisar y ajustar `page.tsx` del dashboard
8. Actualizar bottom tabs y pantallas principales en `apps/ciudadano`
9. Correr `tsc --noEmit` — debe dar 0 errores
10. Commit: `feat: aplicar paleta Indigo Pro al panel web y app ciudadano`

---

### VERIFICACIÓN FINAL

Antes de hacer commit, confirma:
- [ ] Sidebar web: fondo blanco, ítem activo en `#e0e7ff` / `#312e81`
- [ ] TopBar: fondo blanco, borde `#c7d2fe`, logo en `#312e81`
- [ ] Página dashboard: fondo `#eef2ff`, cards en pasteles índigo/violeta
- [ ] Login: fondo `#eef2ff`, card blanca, botón `#4f46e5`
- [ ] App: header blanco, fondo `#eef2ff`, tabs activo `#4f46e5`
- [ ] `tsc --noEmit` = 0 errores
- [ ] Sin clases Tailwind custom sin definir
