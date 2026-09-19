import { APP_FILTER } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { patchSqlExecutionContextMiddleware } from './common/patch-datapaas-rls';

patchSqlExecutionContextMiddleware();

import { DatabaseModule } from './database/database.module';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { DiaryModule } from './modules/diary/diary.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CollectionModule } from './modules/collection/collection.module';
import { GuestbookModule } from './modules/guestbook/guestbook.module';
import { LiteratureModule } from './modules/literature/literature.module';
import { AdminModule } from './modules/admin/admin.module';
import { HomeModule } from './modules/home/home.module';
import { UploadModule } from './modules/upload/upload.module';
import { ViewModule } from './modules/view/view.module';

@Module({
  imports: [
    PlatformModule.forRoot(),
    DatabaseModule.forRoot(),
    AuthModule,
    DiaryModule,
    CalendarModule,
    CollectionModule,
    GuestbookModule,
    LiteratureModule,
    AdminModule,
    HomeModule,
    UploadModule,
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
