import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { initFCM } from './services/notifications.service.js';

import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';
import { incidentesRoutes } from './routes/incidentes.js';
import { alertasRoutes } from './routes/alertas.js';
import { archivosRoutes } from './routes/archivos.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { recursosRoutes } from './routes/recursos.js';
import { damnificadosRoutes } from './routes/damnificados.js';
import { reportesRoutes } from './routes/reportes.js';
import { usuariosRoutes } from './routes/usuarios.js';
import { municipiosRoutes } from './routes/municipios.js';

const IS_DEV = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const GOV_CO_ORIGINS = /^https:\/\/.*\.gov\.co$/;

async function bootstrap(): Promise<void> {
  const app = Fastify({
    logger: IS_DEV
      ? {
          level: 'info',
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: 'info' },
    disableRequestLogging: false,
  });

  // Seguridad HTTP — HSTS habilitado, CSP omitido en dev
  await app.register(helmet, {
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: IS_DEV ? false : undefined,
  });

  // CORS — solo dominios gov.co en producción
  await app.register(cors, {
    origin: IS_DEV ? true : GOV_CO_ORIGINS,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Rate limit — 200 req/min por IP
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Límite de solicitudes excedido. Intente nuevamente en un minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  });

  // Multipart — máx 10 MB
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Error handler global
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        code: error.code,
      });
    }

    // Errores de validación Fastify (JSON schema / multipart)
    if (error.statusCode === 400) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
        code: 'BAD_REQUEST',
      });
    }

    // Error no manejado — no exponer detalles en producción
    logger.error({ err: error }, 'Error no manejado');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: IS_DEV ? error.message : 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  });

  // Registrar rutas bajo /api/v1
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(syncRoutes, { prefix: '/api/v1' });
  await app.register(incidentesRoutes, { prefix: '/api/v1' });
  await app.register(alertasRoutes, { prefix: '/api/v1' });
  await app.register(archivosRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(dashboardRoutes, { prefix: '/api/v1' });
  await app.register(recursosRoutes, { prefix: '/api/v1' });
  await app.register(damnificadosRoutes, { prefix: '/api/v1' });
  await app.register(reportesRoutes, { prefix: '/api/v1' });
  await app.register(usuariosRoutes, { prefix: '/api/v1' });
  await app.register(municipiosRoutes, { prefix: '/api/v1' });

  // Inicializar FCM (modo graceful si no configurado)
  initFCM();

  // Arrancar servidor
  await app.listen({ port: PORT, host: '0.0.0.0' });
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'SIAGRD API iniciada');
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Error fatal al iniciar el servidor');
  process.exit(1);
});
