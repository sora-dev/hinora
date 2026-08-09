import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DepartmentsModule } from './departments/departments.module';
import { LocationsModule } from './locations/locations.module';
import { PoliciesModule } from './policies/policies.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReadingProgressModule } from './reading-progress/reading-progress.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesPermissionsModule,
    CategoriesModule,
    DepartmentsModule,
    LocationsModule,
    PoliciesModule,
    AssessmentsModule,
    ReadingProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
