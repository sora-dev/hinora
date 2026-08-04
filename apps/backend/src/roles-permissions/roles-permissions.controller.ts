import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RolesPermissionsService } from './roles-permissions.service';

@Controller('roles-permissions')
export class RolesPermissionsController {
  constructor(
    private readonly rolesPermissionsService: RolesPermissionsService,
  ) {}

  @Get('roles')
  listRoles() {
    return this.rolesPermissionsService.listRoles();
  }

  @Get('roles/:id')
  getRole(@Param('id') id: string) {
    return this.rolesPermissionsService.getRole(id);
  }

  @Post('roles')
  createRole(@Body() body: Record<string, unknown>) {
    return this.rolesPermissionsService.createRole(body);
  }

  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.rolesPermissionsService.updateRole(id, body);
  }

  @Post('roles/:id/clone')
  cloneRole(@Param('id') id: string) {
    return this.rolesPermissionsService.cloneRole(id);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.rolesPermissionsService.deleteRole(id);
  }

  @Patch('roles/:id/view')
  updateViewPermission(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.rolesPermissionsService.updateViewPermission(id, body);
  }

  @Patch('roles/:id/permissions')
  updateRolePermissions(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.rolesPermissionsService.updateRolePermissions(id, body);
  }

  @Get('sidebar')
  listSidebarModules(@Query() query: Record<string, unknown>) {
    return this.rolesPermissionsService.listSidebarModules(query);
  }

  @Get('role-titles')
  listRoleTitles() {
    return this.rolesPermissionsService.listRoleTitles();
  }
}
