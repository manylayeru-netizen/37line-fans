const { NestFactory } = require('@nestjs/core');

let cachedApp = null;

async function getApp() {
  if (cachedApp) return cachedApp;

  const { VercelAppModule } = require('../dist/server/vercel-app.module.js');

  const app = await NestFactory.create(VercelAppModule, {
    logger: ['error', 'warn'],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  });

  await app.init();
  cachedApp = app;
  return app;
}

module.exports = async function handler(req, res) {
  const app = await getApp();
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();
  instance(req, res);
};
