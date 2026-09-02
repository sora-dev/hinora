import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_ID = 'default';

const defaults = {
  organizationName: 'Rural Bank of Hinora',
  organizationCode: 'RBH',
  organizationAddress:
    'Main Corporate Office\nLa Trinidad, Benguet 2601\nPhilippines',
  organizationPhone: '+63 74 422 1000',
  logoUrl: '/branding/hinora-logo-icon.png',
  timeZone: 'asia-manila',
  dateFormat: 'mm-dd-yyyy',
  timeFormat: '12h',
  language: 'en-ph',
  landingPage: 'dashboard',
  policyVisibility: 'assigned',
} as const;

@Injectable()
export class OrganizationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.ensureRow();
    return { data: this.toResponse(row) };
  }

  async update(body: Record<string, unknown>) {
    await this.ensureRow();

    const organizationName = this.readRequiredString(
      body.organizationName,
      'organizationName',
    );
    const organizationCode = this.readRequiredString(
      body.organizationCode,
      'organizationCode',
    );

    const updated = await this.prisma.organizationSettings.update({
      where: { id: DEFAULT_ID },
      data: {
        organizationName,
        organizationCode,
        organizationAddress: this.readString(body.organizationAddress),
        organizationPhone: this.readString(body.organizationPhone),
        logoUrl: this.readLogoUrl(body.logoUrl),
        timeZone: this.readOptionalString(body.timeZone) ?? defaults.timeZone,
        dateFormat:
          this.readOptionalString(body.dateFormat) ?? defaults.dateFormat,
        timeFormat:
          this.readOptionalString(body.timeFormat) ?? defaults.timeFormat,
        language: this.readOptionalString(body.language) ?? defaults.language,
        landingPage:
          this.readOptionalString(body.landingPage) ?? defaults.landingPage,
        policyVisibility:
          this.readOptionalString(body.policyVisibility) ??
          defaults.policyVisibility,
      },
    });

    return { data: this.toResponse(updated) };
  }

  private async ensureRow() {
    const existing = await this.prisma.organizationSettings.findUnique({
      where: { id: DEFAULT_ID },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.organizationSettings.create({
      data: {
        id: DEFAULT_ID,
        ...defaults,
      },
    });
  }

  private toResponse(row: {
    organizationName: string;
    organizationCode: string;
    organizationAddress: string;
    organizationPhone: string;
    logoUrl: string | null;
    timeZone: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
    landingPage: string;
    policyVisibility: string;
  }) {
    return {
      organizationName: row.organizationName,
      organizationCode: row.organizationCode,
      organizationAddress: row.organizationAddress,
      organizationPhone: row.organizationPhone,
      logoUrl: row.logoUrl,
      timeZone: row.timeZone,
      dateFormat: row.dateFormat,
      timeFormat: row.timeFormat,
      language: row.language,
      landingPage: row.landingPage,
      policyVisibility: row.policyVisibility,
    };
  }

  private readRequiredString(value: unknown, fieldName: string) {
    const text = this.readOptionalString(value);
    if (!text) {
      throw new BadRequestException(`${fieldName} is required.`);
    }
    return text;
  }

  private readOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private readLogoUrl(value: unknown) {
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return defaults.logoUrl;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
