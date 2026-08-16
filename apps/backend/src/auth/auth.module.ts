import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RolesPermissionsModule } from '../roles-permissions/roles-permissions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DeviceInfoService } from './device-info.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'hinora-dev-secret',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as never,
      },
    }),
    RolesPermissionsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, DeviceInfoService],
})
export class AuthModule {}
