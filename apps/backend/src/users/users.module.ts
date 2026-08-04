import { Module } from '@nestjs/common';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [RolesPermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
