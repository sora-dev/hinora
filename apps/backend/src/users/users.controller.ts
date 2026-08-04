import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: Record<string, string | undefined>) {
    return this.usersService.listUsers(query);
  }

  @Post()
  createUser(@Body() body: Record<string, unknown>) {
    return this.usersService.createUser(body);
  }

  @Post('import')
  importUsers(@Body() body: Record<string, unknown>) {
    return this.usersService.importUsers(body);
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
