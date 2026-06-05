'use client';

// Thin wrapper — la lógica real está en alertas/nueva/page.tsx
// Este export permite reusar el flujo en otros contextos (modal, etc.)
export { default as AlertaEmision } from '@/app/(dashboard)/alertas/nueva/page';
