import { Global, Module, DynamicModule, Logger } from '@nestjs/common';
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as urlModule from 'url';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';

const PG_QUERY_PARAMS = new Set([
  'sslmode', 'options', 'schema', 'channel_binding',
  'application_name', 'connect_timeout', 'statement_timeout',
  'lock_timeout', 'idle_in_transaction_session_timeout',
]);

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.SUDA_DATABASE_URL ||
    process.env.FORCE_DB_CONNECT_URL ||
    ''
  );
}

function buildMysqlPoolConfig(rawUrl: string): mysql.PoolOptions {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : 3306;
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.replace(/^\//, '') || undefined;

  const sslParam = parsed.searchParams.get('ssl');
  let ssl: mysql.SslOptions | undefined;
  if (sslParam) {
    try {
      ssl = JSON.parse(sslParam);
    } catch {
      ssl = { rejectUnauthorized: sslParam === 'true' || sslParam === '1' };
    }
  } else if (
    parsed.searchParams.get('sslmode') === 'require' ||
    rawUrl.includes('tidbcloud') ||
    rawUrl.includes('neon.tech')
  ) {
    ssl = { rejectUnauthorized: true };
  }

  const config: mysql.PoolOptions = {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 1,
    maxIdle: 1,
    idleTimeout: 5000,
    queueLimit: 0,
    connectTimeout: 15000,
  };

  if (ssl) {
    config.ssl = ssl;
  }

  return config;
}

function isTiDBLikeUrl(url: string): boolean {
  return (
    url.includes('tidbcloud') ||
    url.includes('tidb') ||
    url.includes('ssl={"rejectUnauthorized"') ||
    url.includes('ssl-mode=VERIFY_IDENTITY')
  );
}

@Global()
@Module({})
export class DatabaseModule {
  private static logger = new Logger('DatabaseModule');

  static forRoot(): DynamicModule {
    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      this.logger.error(
        'No DATABASE_URL found. Set DATABASE_URL, SUDA_DATABASE_URL, or FORCE_DB_CONNECT_URL.',
      );
    }

    const providers = [
      {
        provide: DRIZZLE_DATABASE,
        useFactory: (): MySql2Database => {
          const url = getDatabaseUrl();
          if (!url) {
            throw new Error(
              'DATABASE_URL environment variable is required. ' +
                'Please set it to your MySQL/TiDB connection string.',
            );
          }

          const tiDBLike = isTiDBLikeUrl(url);

          DatabaseModule.logger.log(
            `Initializing database connection (tidb=${tiDBLike}, driver=mysql2)`,
          );

          const poolConfig = buildMysqlPoolConfig(url);
          const pool = mysql.createPool(poolConfig);

          const db = drizzle(pool, { mode: 'default' });
          DatabaseModule.logger.log('Database connection pool created (lazy connect)');
          return db;
        },
      },
    ];

    return {
      module: DatabaseModule,
      providers,
      exports: [DRIZZLE_DATABASE],
    };
  }
}
