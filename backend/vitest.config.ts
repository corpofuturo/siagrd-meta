import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/services/**'],
      exclude: [
        'src/services/telegram.service.ts',
        'src/services/whatsapp.service.ts',
        'src/services/whatsapp-webapp.service.ts',
        'src/services/webhook.service.ts',
      ],
      thresholds: { lines: 60, functions: 70, branches: 45 },
    },
  },
});
