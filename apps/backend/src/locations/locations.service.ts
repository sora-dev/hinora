import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LocationStatus,
  Prisma,
  type Location,
  type User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ListLocationsQuery = Record<string, string | undefined>;

type LocationWithRelations = Location & {
  manager: User | null;
  _count: {
    users: number;
    departments: number;
  };
};

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLocations(query: ListLocationsQuery) {
    const search = this.normalizeOptionalString(query.search);
    const status = this.parseOptionalStatus(query.status);

    const where: Prisma.LocationWhereInput = {
      AND: [
        status ? { status } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { province: { contains: search, mode: 'insensitive' } },
                { streetAddress: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [locations, allLocations] = await Promise.all([
      this.prisma.location.findMany({
        where,
        include: {
          manager: true,
          _count: {
            select: {
              users: true,
              departments: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.location.findMany({
        select: { status: true },
      }),
    ]);

    const stats = {
      totalLocations: allLocations.length,
      activeLocations: allLocations.filter(
        (location) => location.status === LocationStatus.ACTIVE,
      ).length,
      totalEmployees: locations.reduce(
        (sum, location) => sum + location._count.users,
        0,
      ),
      totalDepartments: locations.reduce(
        (sum, location) => sum + location._count.departments,
        0,
      ),
    };

    return {
      data: locations.map((location) => this.toLocationResponse(location)),
      stats,
      filters: {
        statuses: Object.values(LocationStatus).map((value) =>
          this.toUiStatus(value),
        ),
      },
    };
  }

  async listOptions() {
    const locations = await this.prisma.location.findMany({
      where: {
        status: {
          in: [LocationStatus.ACTIVE, LocationStatus.MAINTENANCE],
        },
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        status: true,
      },
    });

    return {
      data: locations.map((location) => ({
        id: location.id,
        name: location.name,
        code: location.code,
        city: location.city,
        status: this.toUiStatus(location.status),
      })),
    };
  }

  async getLocation(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      include: {
        manager: true,
        _count: {
          select: {
            users: true,
            departments: true,
          },
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location ${locationId} was not found.`);
    }

    return { data: this.toLocationResponse(location) };
  }

  async createLocation(body: Record<string, unknown>) {
    const data = await this.buildCreateOrUpdateInput(body);

    try {
      const location = await this.prisma.location.create({
        data,
        include: {
          manager: true,
          _count: {
            select: {
              users: true,
              departments: true,
            },
          },
        },
      });

      return { data: this.toLocationResponse(location) };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateLocation(locationId: string, body: Record<string, unknown>) {
    await this.ensureLocationExists(locationId);
    const data = await this.buildCreateOrUpdateInput(body, true);

    try {
      const location = await this.prisma.location.update({
        where: { id: locationId },
        data,
        include: {
          manager: true,
          _count: {
            select: {
              users: true,
              departments: true,
            },
          },
        },
      });

      return { data: this.toLocationResponse(location) };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async deleteLocation(locationId: string) {
    await this.ensureLocationExists(locationId);

    await this.prisma.location.delete({
      where: { id: locationId },
    });

    return { success: true };
  }

  private toLocationResponse(location: LocationWithRelations) {
    const manager = location.manager
      ? {
          id: location.manager.id,
          name: `${location.manager.firstName} ${location.manager.lastName}`.trim(),
          email: location.manager.email,
          initials: this.getInitials(
            location.manager.firstName,
            location.manager.lastName,
          ),
          jobTitle: location.manager.jobTitle,
        }
      : {
          name: 'Unassigned',
          email: 'unassigned@company.com',
          initials: 'UA',
        };

    const streetAddress = location.streetAddress;
    const city = location.city;
    const province = location.province;

    return {
      id: location.id,
      name: location.name,
      code: location.code,
      streetAddress,
      city,
      province,
      postalCode: location.postalCode,
      email: location.email,
      phone: location.phone,
      description: location.description,
      subtitle: [streetAddress, city, province].filter(Boolean).join(', '),
      manager,
      employees: location._count.users,
      departments: location._count.departments,
      status: this.toUiStatus(location.status),
      managerUserId: location.managerUserId,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  private async buildCreateOrUpdateInput(
    body: Record<string, unknown>,
    isUpdate = false,
  ): Promise<Prisma.LocationUncheckedCreateInput> {
    const name = isUpdate
      ? this.readOptionalString(body.name)
      : this.readRequiredString(body.name, 'name');
    const code = isUpdate
      ? this.readOptionalString(body.code)
      : this.readRequiredString(body.code, 'code');

    const data: Prisma.LocationUncheckedCreateInput = {
      name: name ?? '',
      code: code ? code.toUpperCase().slice(0, 8) : '',
    };

    if (isUpdate) {
      if (name === undefined) delete (data as { name?: string }).name;
      if (code === undefined) delete (data as { code?: string }).code;
      else data.code = code.toUpperCase().slice(0, 8);
      if (name !== undefined) data.name = name;
    }

    if (body.streetAddress !== undefined) {
      data.streetAddress = this.readOptionalText(body.streetAddress);
    } else if (!isUpdate) {
      data.streetAddress = '';
    }

    if (body.city !== undefined) {
      data.city = this.readOptionalText(body.city);
    } else if (!isUpdate) {
      data.city = '';
    }

    if (body.province !== undefined) {
      data.province = this.readOptionalText(body.province);
    } else if (!isUpdate) {
      data.province = '';
    }

    if (body.postalCode !== undefined) {
      data.postalCode = this.readOptionalText(body.postalCode);
    } else if (!isUpdate) {
      data.postalCode = '';
    }

    if (body.email !== undefined) {
      data.email = this.readOptionalText(body.email);
    } else if (!isUpdate) {
      data.email = '';
    }

    if (body.phone !== undefined) {
      data.phone = this.readOptionalText(body.phone);
    } else if (!isUpdate) {
      data.phone = '';
    }

    if (body.description !== undefined) {
      data.description = this.readOptionalText(body.description);
    } else if (!isUpdate) {
      data.description = '';
    }

    if (body.status !== undefined) {
      data.status = this.parseRequiredStatus(body.status);
    } else if (!isUpdate) {
      data.status = LocationStatus.ACTIVE;
    }

    if (body.managerUserId !== undefined) {
      data.managerUserId = await this.parseOptionalUserId(body.managerUserId);
    }

    return data;
  }

  private async ensureLocationExists(locationId: string) {
    const existing = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Location ${locationId} was not found.`);
    }
  }

  private async parseOptionalUserId(value: unknown) {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('managerUserId must be a string.');
    }

    const userId = value.trim();
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Selected manager user was not found.');
    }

    return userId;
  }

  private toUiStatus(status: LocationStatus) {
    if (status === LocationStatus.ACTIVE) return 'Active';
    if (status === LocationStatus.MAINTENANCE) return 'Maintenance';
    return 'Inactive';
  }

  private parseOptionalStatus(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return this.parseRequiredStatus(value);
  }

  private parseRequiredStatus(value: unknown) {
    const normalized = this.readRequiredString(value, 'status')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (normalized === 'ACTIVE') return LocationStatus.ACTIVE;
    if (normalized === 'MAINTENANCE') return LocationStatus.MAINTENANCE;
    if (normalized === 'INACTIVE') return LocationStatus.INACTIVE;

    throw new BadRequestException(
      'status must be Active, Maintenance, or Inactive.',
    );
  }

  private getInitials(firstName: string, lastName: string) {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'UA';
  }

  private normalizeOptionalString(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return value.trim();
  }

  private readOptionalString(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.readRequiredString(value, 'value');
  }

  private readOptionalText(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A location with that code already exists.',
      );
    }

    throw error;
  }
}
