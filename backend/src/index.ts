import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';

import { logger } from './utils/logger.js';
import { AppError } from './utils/errors.js';
import { initFCM, processNotificationQueue } from './services/notifications.service.js';

import bcrypt from 'bcryptjs';
import { db } from './lib/db.js';
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
import { webhooksRoutes } from './routes/webhooks.js';
import { chatRoutes } from './routes/chat.js';
import { estadisticasRoutes } from './routes/estadisticas.js';
import { informesRoutes } from './routes/informes.js';
import { organismosRoutes } from './routes/organismos.js';

// Validación temprana de variables de entorno obligatorias
const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variable de entorno requerida no definida: ${key}`);
    process.exit(1);
  }
}

const IS_DEV = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const ALLOWED_ORIGINS = [
  /^https:\/\/.*\.gov\.co$/,
  /^https:\/\/.*\.netlify\.app$/,
  'https://siagrd-panel-web.netlify.app',
];

async function seedDemoUsers(): Promise<void> {
  const seeds = [
    { email: 'admin',   password: 'admin',   nombre: 'Administrador', apellido: 'SATAM', rol: 'ADMIN'   },
    { email: 'bombero', password: 'bombero', nombre: 'Bombero',       apellido: 'Demo',  rol: 'SOCORRO' },
  ];
  for (const u of seeds) {
    const [existing] = await db`SELECT id FROM profiles WHERE email = ${u.email}`;
    if (!existing) {
      const hash = await bcrypt.hash(u.password, 10);
      await db`INSERT INTO profiles (email, password_hash, nombre, apellido, rol, activo) VALUES (${u.email}, ${hash}, ${u.nombre}, ${u.apellido}, ${u.rol}, true)`;
      logger.info(`Usuario demo creado: ${u.email}`);
    }
  }
}

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
    origin: IS_DEV ? true : ALLOWED_ORIGINS,
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
  await app.register(webhooksRoutes, { prefix: '/api/v1' });
  await app.register(chatRoutes, { prefix: '/api/v1' });
  await app.register(estadisticasRoutes, { prefix: '/api/v1' });
  await app.register(informesRoutes, { prefix: '/api/v1' });
  await app.register(organismosRoutes, { prefix: '/api/v1' });

  // Inicializar FCM (modo graceful si no configurado)
  initFCM();

  // Arrancar servidor primero — seed en background para no bloquear el startup
  await app.listen({ port: PORT, host: '0.0.0.0' });
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'SIAGRD API iniciada');

  // Seed usuarios demo si no existen (no bloquea el startup)
  seedDemoUsers().catch((err) => logger.warn({ err }, 'seedDemoUsers falló — continuando sin seed'));

  // Worker de cola durable de notificaciones — ejecuta cada 30 segundos
  setInterval(() => {
    processNotificationQueue().catch((err) =>
      logger.error({ err }, 'Error en worker de notificaciones'),
    );
  }, 30_000);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Error fatal al iniciar el servidor');
  process.exit(1);
});
