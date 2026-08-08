import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  RoleDefinitionType,
  type RoleDefinition,
  type RoleModulePermission,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  isModuleKey,
  legacyModuleKeyMap,
  moduleOrder,
  hasAdminPortalAccess,
  type ModuleKey,
} from './permission-modules';

const deniedPermissionFlags = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
  canPublish: false,
} as const;

type RoleWithPermissions = RoleDefinition & {
  permissions: RoleModulePermission[];
};

@Injectable()
export class RolesPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    const [roles, users] = await Promise.all([
      this.prisma.roleDefinition.findMany({
        include: {
          permissions: true,
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.user.findMany({
        select: {
          roleTitle: true,
        },
      }),
    ]);

    await Promise.all(roles.map((role) => this.syncRolePermissions(role.id)));

    const refreshedRoles = await this.prisma.roleDefinition.findMany({
      include: {
        permissions: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return {
      data: refreshedRoles.map((role) =>
        this.toRoleSummary(
          role,
          users.filter((user) => user.roleTitle === role.name).length,
        ),
      ),
    };
  }

  async getRole(roleId: string) {
    const role = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    await this.syncRolePermissions(role.id);

    const refreshedRole = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!refreshedRole) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    const assignedUsers = await this.prisma.user.count({
      where: {
        roleTitle: refreshedRole.name,
      },
    });

    return this.toRoleDetail(refreshedRole, assignedUsers);
  }

  async createRole(body: Record<string, unknown>) {
    const name = this.readRequiredString(body.name, 'name');
    const code =
      this.normalizeOptionalString(body.code) ??
      name
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    const description = this.normalizeOptionalString(body.description);
    const type = this.parseOptionalRoleType(body.type) ?? RoleDefinitionType.CUSTOM;
    const createdBy =
      this.normalizeOptionalString(body.createdBy) ?? 'Hinora Administrator';

    try {
      const role = await this.prisma.roleDefinition.create({
        data: {
          name,
          code,
          description,
          type,
          createdBy,
          permissions: {
            create: moduleOrder.map((moduleKey) => ({
              moduleKey,
              canView:
                moduleKey === 'Dashboard' ||
                moduleKey === 'Policy Library',
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canApprove: false,
              canPublish: false,
            })),
          },
        },
        include: {
          permissions: true,
        },
      });

      return this.toRoleDetail(role, 0);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateRole(roleId: string, body: Record<string, unknown>) {
    const existingRole = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    const nextName =
      this.normalizeOptionalString(body.name) ?? existingRole.name;
    const nextCode =
      this.normalizeOptionalString(body.code) ?? existingRole.code;
    const nextDescription =
      body.description === null
        ? null
        : this.normalizeOptionalString(body.description) ??
          existingRole.description;
    const nextType =
      this.parseOptionalRoleType(body.type) ?? existingRole.type;

    try {
      const updatedRole = await this.prisma.$transaction(async (tx) => {
        const role = await tx.roleDefinition.update({
          where: { id: roleId },
          data: {
            name: nextName,
            code: nextCode,
            description: nextDescription,
            type: nextType,
          },
          include: {
            permissions: true,
          },
        });

        if (existingRole.name !== nextName) {
          await tx.user.updateMany({
            where: {
              roleTitle: existingRole.name,
            },
            data: {
              roleTitle: nextName,
            },
          });
        }

        return role;
      });

      const assignedUsers = await this.prisma.user.count({
        where: {
          roleTitle: updatedRole.name,
        },
      });

      return this.toRoleDetail(updatedRole, assignedUsers);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async cloneRole(roleId: string) {
    const existingRole = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    const nextName = await this.generateUniqueName(existingRole.name);
    const nextCode = await this.generateUniqueCode(existingRole.code);

    try {
      const clonedRole = await this.prisma.roleDefinition.create({
        data: {
          name: nextName,
          code: nextCode,
          description: existingRole.description,
          type: RoleDefinitionType.CUSTOM,
          createdBy: 'John Dela Cruz',
          permissions: {
            create: existingRole.permissions.map((permission) => ({
              moduleKey: permission.moduleKey,
              canView: permission.canView,
              canCreate: permission.canCreate,
              canEdit: permission.canEdit,
              canDelete: permission.canDelete,
              canApprove: permission.canApprove,
              canPublish: permission.canPublish,
            })),
          },
        },
        include: {
          permissions: true,
        },
      });

      return this.toRoleDetail(clonedRole, 0);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async deleteRole(roleId: string) {
    const existingRole = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    if (existingRole.type === RoleDefinitionType.SYSTEM) {
      throw new BadRequestException('System roles cannot be deleted.');
    }

    const assignedUsers = await this.prisma.user.count({
      where: {
        roleTitle: existingRole.name,
      },
    });

    if (assignedUsers > 0) {
      throw new BadRequestException(
        'This role cannot be deleted while it is assigned to users.',
      );
    }

    await this.prisma.roleDefinition.delete({
      where: { id: roleId },
    });

    return {
      success: true,
      message: `Deleted role ${existingRole.name}.`,
    };
  }

  async updateViewPermission(roleId: string, body: Record<string, unknown>) {
    const moduleKey = this.readRequiredString(body.moduleKey, 'moduleKey');

    if (!isModuleKey(moduleKey)) {
      throw new BadRequestException('moduleKey is not a supported module.');
    }

    const canView = this.readRequiredBoolean(body.canView, 'canView');

    const role = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    await this.prisma.roleModulePermission.upsert({
      where: {
        roleId_moduleKey: {
          roleId,
          moduleKey,
        },
      },
      update: {
        canView,
      },
      create: {
        roleId,
        moduleKey,
        canView,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canPublish: false,
      },
    });

    return this.getRole(roleId);
  }

  async updateRolePermissions(roleId: string, body: Record<string, unknown>) {
    const role = await this.prisma.roleDefinition.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} was not found.`);
    }

    const permissions = body.permissions;

    if (!Array.isArray(permissions) || permissions.length === 0) {
      throw new BadRequestException('permissions must be a non-empty array.');
    }

    const incomingPermissions = permissions.map((permission, index) => {
      if (typeof permission !== 'object' || permission === null) {
        throw new BadRequestException(
          `permissions[${index}] must be an object.`,
        );
      }

      const record = permission as Record<string, unknown>;
      const moduleKey = this.readRequiredString(
        record.moduleKey,
        `permissions[${index}].moduleKey`,
      );

      if (!isModuleKey(moduleKey)) {
        throw new BadRequestException(
          `permissions[${index}].moduleKey is not supported.`,
        );
      }

      return {
        moduleKey,
        canView: this.readRequiredBoolean(
          record.canView,
          `permissions[${index}].canView`,
        ),
        canCreate:
          typeof record.canCreate === 'boolean' ? record.canCreate : false,
        canEdit: typeof record.canEdit === 'boolean' ? record.canEdit : false,
        canDelete:
          typeof record.canDelete === 'boolean' ? record.canDelete : false,
        canApprove:
          typeof record.canApprove === 'boolean' ? record.canApprove : false,
        canPublish:
          typeof record.canPublish === 'boolean' ? record.canPublish : false,
      };
    });

    await this.prisma.$transaction(
      incomingPermissions.map((permission) =>
        this.prisma.roleModulePermission.upsert({
          where: {
            roleId_moduleKey: {
              roleId,
              moduleKey: permission.moduleKey,
            },
          },
          update: {
            canView: permission.canView,
            canCreate: permission.canCreate,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
            canApprove: permission.canApprove,
            canPublish: permission.canPublish,
          },
          create: {
            roleId,
            moduleKey: permission.moduleKey,
            canView: permission.canView,
            canCreate: permission.canCreate,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
            canApprove: permission.canApprove,
            canPublish: permission.canPublish,
          },
        }),
      ),
    );

    return this.getRole(roleId);
  }

  async listSidebarModules(query: Record<string, unknown>) {
    const roleTitle = this.readRequiredString(query.roleTitle, 'roleTitle');

    const role = await this.prisma.roleDefinition.findUnique({
      where: { name: roleTitle },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`Role title ${roleTitle} was not found.`);
    }

    // Keep module keys current (e.g. Acknowledgement Management → Compliance Center).
    await this.syncRolePermissions(role.id);

    const syncedRole = await this.prisma.roleDefinition.findUnique({
      where: { id: role.id },
      include: {
        permissions: true,
      },
    });

    if (!syncedRole) {
      throw new NotFoundException(`Role title ${roleTitle} was not found.`);
    }

    const viewModules = syncedRole.permissions
      .filter((permission) => permission.canView)
      .sort(
        (left, right) =>
          moduleOrder.indexOf(left.moduleKey as ModuleKey) -
          moduleOrder.indexOf(right.moduleKey as ModuleKey),
      )
      .map((permission) => permission.moduleKey);

    return {
      roleTitle,
      modules: viewModules,
      portal: hasAdminPortalAccess(viewModules) ? 'admin' : 'employee',
    };
  }

  async resolveLoginRedirect(roleTitle: string, fallbackRole: Role) {
    const role = await this.prisma.roleDefinition.findUnique({
      where: { name: roleTitle },
      include: {
        permissions: true,
      },
    });

    if (!role) {
      return fallbackRole === Role.EMPLOYEE
        ? '/employee/dashboard'
        : '/admin/dashboard';
    }

    const viewModules = role.permissions
      .filter((permission) => permission.canView)
      .map((permission) => permission.moduleKey);

    return hasAdminPortalAccess(viewModules)
      ? '/admin/dashboard'
      : '/employee/dashboard';
  }

  async listRoleTitles() {
    const roles = await this.prisma.roleDefinition.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        description: true,
      },
    });

    return {
      data: roles,
    };
  }

  async assertRoleTitleExists(roleTitle: string) {
    const existingRole = await this.prisma.roleDefinition.findUnique({
      where: { name: roleTitle },
      select: { id: true },
    });

    if (!existingRole) {
      throw new BadRequestException(
        `roleTitle must match a role created in Roles & Permissions.`,
      );
    }
  }

  private async syncRolePermissions(roleId: string) {
    const permissions = await this.prisma.roleModulePermission.findMany({
      where: { roleId },
    });

    for (const permission of permissions) {
      const mappedKey = legacyModuleKeyMap[permission.moduleKey];

      if (!mappedKey || mappedKey === permission.moduleKey) {
        continue;
      }

      const target = permissions.find((item) => item.moduleKey === mappedKey);

      if (target) {
        if (permission.canView && !target.canView) {
          await this.prisma.roleModulePermission.update({
            where: { id: target.id },
            data: { canView: true },
          });
        }

        await this.prisma.roleModulePermission.delete({
          where: { id: permission.id },
        });
      } else {
        await this.prisma.roleModulePermission.update({
          where: { id: permission.id },
          data: { moduleKey: mappedKey },
        });
      }
    }

    const refreshed = await this.prisma.roleModulePermission.findMany({
      where: { roleId },
    });
    const existingKeys = new Set(refreshed.map((permission) => permission.moduleKey));
    const missingKeys = moduleOrder.filter((moduleKey) => !existingKeys.has(moduleKey));

    if (missingKeys.length > 0) {
      await this.prisma.roleModulePermission.createMany({
        data: missingKeys.map((moduleKey) => ({
          roleId,
          moduleKey,
          ...deniedPermissionFlags,
        })),
        skipDuplicates: true,
      });
    }

    const latest = await this.prisma.roleModulePermission.findMany({
      where: { roleId },
    });
    const obsoleteKeys = latest
      .map((permission) => permission.moduleKey)
      .filter((moduleKey) => !isModuleKey(moduleKey));

    if (obsoleteKeys.length > 0) {
      await this.prisma.roleModulePermission.deleteMany({
        where: {
          roleId,
          moduleKey: {
            in: obsoleteKeys,
          },
        },
      });
    }
  }

  private toRoleSummary(role: RoleWithPermissions, userCount: number) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      type: role.type,
      description: role.description,
      userCount,
      viewModules: role.permissions
        .filter((permission) => permission.canView)
        .map((permission) => permission.moduleKey),
    };
  }

  private toRoleDetail(role: RoleWithPermissions, assignedUsers: number) {
    const permissionMap = new Map(
      role.permissions.map((permission) => [permission.moduleKey, permission]),
    );

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      type: role.type,
      description: role.description,
      createdBy: role.createdBy,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      assignedUsers,
      permissions: moduleOrder.map((moduleKey) => {
        const permission = permissionMap.get(moduleKey);

        return {
          moduleKey,
          canView: permission?.canView ?? false,
          canCreate: permission?.canCreate ?? false,
          canEdit: permission?.canEdit ?? false,
          canDelete: permission?.canDelete ?? false,
          canApprove: permission?.canApprove ?? false,
          canPublish: permission?.canPublish ?? false,
        };
      }),
    };
  }

  private parseOptionalRoleType(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const normalized = this.readRequiredString(value, 'type').toUpperCase();

    if (!Object.values(RoleDefinitionType).includes(normalized as RoleDefinitionType)) {
      throw new BadRequestException('type must be SYSTEM or CUSTOM.');
    }

    return normalized as RoleDefinitionType;
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private readRequiredBoolean(value: unknown, fieldName: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${fieldName} must be true or false.`);
    }

    return value;
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized || undefined;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A role with the same name or code already exists.',
      );
    }

    throw error;
  }

  private async generateUniqueName(baseName: string) {
    let attempt = 1;

    while (true) {
      const suffix = attempt === 1 ? 'Copy' : `Copy ${attempt}`;
      const candidate = `${baseName} ${suffix}`;

      const existing = await this.prisma.roleDefinition.findUnique({
        where: { name: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      attempt += 1;
    }
  }

  private async generateUniqueCode(baseCode: string) {
    let attempt = 1;

    while (true) {
      const candidate =
        attempt === 1 ? `${baseCode}C` : `${baseCode}C${attempt}`;

      const existing = await this.prisma.roleDefinition.findUnique({
        where: { code: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      attempt += 1;
    }
  }
}
