import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: Record<string, string | undefined>) {
    return this.usersService.listUsers(query);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Post()
  createUser(@Body() body: Record<string, unknown>) {
    return this.usersService.createUser(body);
  }

  @Post('import')
  importUsers(@Body() body: Record<string, unknown>) {
    return this.usersService.importUsers(body);
  }

  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.usersService.uploadAvatar(id, file);
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.usersService.updateUser(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.usersService.updateStatus(id, body);
  }

  @Patch(':id/password')
  updatePassword(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updatePassword(id, body);
  }
}
