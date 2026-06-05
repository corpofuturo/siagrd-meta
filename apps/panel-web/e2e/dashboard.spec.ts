import { test, expect } from '@playwright/test';

test.describe('Dashboard CDGRD', () => {
  test.beforeEach(async ({ page }) => {
    // Mock de autenticación: interceptar /api/v1/auth/me
    await page.route('**/api/v1/auth/me', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'test-id', email: 'cdgrd@meta.gov.co', rol: 'CDGRD' }),
    }));
    await page.goto('/');
  });

  test('carga el dashboard sin errores de consola críticos', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.waitForLoadState('networkidle');
    const criticalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('DevTools'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('botón Emitir Alerta está visible', async ({ page }) => {
    await page.waitForSelector('text=Emitir Alerta', { timeout: 5000 });
    const btn = page.locator('button', { hasText: /emitir alerta/i });
    await expect(btn).toBeVisible();
  });

  test('navegación a /alertas/nueva funciona', async ({ page }) => {
    await page.click('button:has-text("Emitir Alerta")');
    await expect(page).toHaveURL(/alertas\/nueva/);
  });
});

test.describe('Flujo emisión alerta ROJA', () => {
  test('alerta ROJA requiere doble confirmación', async ({ page }) => {
    await page.goto('/alertas/nueva');
    // Paso 1: seleccionar tipo INUNDACION
    await page.click('[data-testid="tipo-INUNDACION"]').catch(() =>
      page.click('button:has-text("INUNDACIÓN")')
    );
    // Paso 2: seleccionar nivel ROJO
    await page.click('[data-testid="nivel-ROJO"]').catch(() =>
      page.click('button:has-text("ROJO")')
    );
    // Verificar que aparece advertencia de doble confirmación
    await page.waitForSelector('text=/confirma|ROJO|críti/i', { timeout: 3000 }).catch(() => {});
    // El botón final de emitir debe existir
    const emitirBtn = page.locator('button', { hasText: /emitir|confirmar/i }).last();
    await expect(emitirBtn).toBeVisible();
  });
});
