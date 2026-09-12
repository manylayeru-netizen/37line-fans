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

          const sslRequired =
            url.includes('sslmode=require') ||
            url.includes('neon.tech') ||
            url.includes('vercel');

          const sql = postgres(url, {
            max: 1,
            ssl: sslRequired ? 'require' : undefined,
            idle_timeout: 5,
            connect_timeout: 10,
          });

          const db = drizzle(sql);
          this.logger.log('Database connection established (standalone mode)');
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
