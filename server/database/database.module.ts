import { Global, Module, DynamicModule, Logger } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// eslint-disable-next-line import/no-extraneous-dependencies
import postgres from 'postgres';

export const DRIZZLE_DATABASE = 'DRIZZLE_DATABASE';

function getDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.SUDA_DATABASE_URL ||
    process.env.FORCE_DB_CONNECT_URL ||
    '';
  return databaseUrl;
}

function isNeonLikeUrl(url: string): boolean {
  return (
    url.includes('neon.tech') ||
    url.includes('neon.db') ||
    url.includes('vercel') ||
    url.includes('sslmode=require')
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
        useFactory: (): PostgresJsDatabase => {
          const url = getDatabaseUrl();
          if (!url) {
            throw new Error(
              'DATABASE_URL environment variable is required. ' +
                'Please set it to your PostgreSQL connection string.',
            );
          }

          const neonLike = isNeonLikeUrl(url);
          const sslMode =
            neonLike || url.includes('sslmode=require')
              ? 'require'
              : url.includes('sslmode=disable')
                ? false
                : undefined;

          DatabaseModule.logger.log(
            `Initializing database connection (neon=${neonLike}, ssl=${sslMode ?? 'default'})`,
          );

          const sql = postgres(url, {
            max: 1,
            ssl: sslMode === 'require' ? { rejectUnauthorized: false } : sslMode,
            idle_timeout: 5,
            connect_timeout: 15,
            max_lifetime: 60 * 10,
            connection: {
              application_name: 'vercel-serverless',
            },
            onnotice: () => {},
          });

          const db = drizzle(sql);
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
