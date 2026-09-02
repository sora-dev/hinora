import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentsModule } from './assessments/assessments.module';
import { ActivityModule } from './activity/activity.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ComplianceModule } from './compliance/compliance.module';
import { DepartmentsModule } from './departments/departments.module';
import { LocationsModule } from './locations/locations.module';
import { OrganizationSettingsModule } from './organization-settings/organization-settings.module';
import { PoliciesModule } from './policies/policies.module';
import { PolicyAssignmentsModule } from './policy-assignments/policy-assignments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReadingProgressModule } from './reading-progress/reading-progress.module';
import { ReportHistoryModule } from './report-history/report-history.module';
import { ReportsModule } from './reports/reports.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    ActivityModule,
    AuditModule,
    UsersModule,
    AuthModule,
    RolesPermissionsModule,
    CategoriesModule,
    ComplianceModule,
    DepartmentsModule,
    LocationsModule,
    OrganizationSettingsModule,
    PoliciesModule,
    PolicyAssignmentsModule,
    NotificationsModule,
    BookmarksModule,
    AssessmentsModule,
    ReadingProgressModule,
    ReportHistoryModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useExisting: AuditInterceptor,
    },
  ],
})
export class AppModule {}
