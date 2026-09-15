const { NestFactory } = require('@nestjs/core');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://37line.fans',
  'https://www.37line.fans',
  'https://37line-fans.vercel.app',
];

const VERCEL_PREVIEW_REGEX = /^https:\/\/.+\.vercel\.app$/;

function getAllowedOriginFn(envOrigin) {
  const envOrigins = envOrigin
    ? envOrigin.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const staticOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (staticOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    if (VERCEL_PREVIEW_REGEX.test(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}

let cachedApp = null;
let initError = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  if (initError) throw initError;

  try {
    const { VercelAppModule } = require('../dist/server/vercel-app.module.js');

    const app = await NestFactory.create(VercelAppModule, {
      logger: ['error', 'warn', 'log'],
      bodyParser: false,
    });

    app.enableCors({
      origin: getAllowedOriginFn(process.env.CORS_ORIGIN),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-larkgw-suda-webuser'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    const rawBodyBuffer = require('body-parser').raw({
      limit: '10mb',
      type: '*/*',
    });

    app.use((req, res, next) => {
      if (req.readableEnded || req.body !== undefined) {
        return next();
      }
      rawBodyBuffer(req, res, (err) => {
        if (err) return next(err);
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            req.body = JSON.parse(req.body.toString('utf8'));
          } catch (e) {
            req.body = {};
          }
        }
        next();
      });
    });

    await app.init();
    cachedApp = app;
    console.log('[Vercel] NestJS app initialized successfully');
    return app;
  } catch (error) {
    initError = error;
    console.error('[Vercel] Failed to initialize NestJS app:', error);
    console.error('[Vercel] Error stack:', error && error.stack);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  const startTime = Date.now();
  console.log(`[Vercel] ${req.method} ${req.url} (content-type: ${req.headers['content-type'] || 'none'}, content-length: ${req.headers['content-length'] || 0})`);

  try {
    const app = await getApp();
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance();
    instance(req, res);
  } catch (error) {
    console.error(`[Vercel] Handler error for ${req.method} ${req.url}:`, error);
    console.error('[Vercel] Stack:', error && error.stack);

    const statusCode = error.status || error.statusCode || 500;
    const errorMessage = error.message || 'Internal Server Error';
    const errorDetails = error.response ? JSON.stringify(error.response) : undefined;

    res.status(statusCode).json({
      error: {
        code: statusCode,
        message: errorMessage,
        details: errorDetails,
        timestamp: Date.now(),
      },
    });
  }

  console.log(`[Vercel] ${req.method} ${req.url} done in ${Date.now() - startTime}ms`);
};
