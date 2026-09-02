import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ReportHistoryFormat,
  ReportHistoryStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REPORT_IDS = new Set([
  'user-activity',
  'document-activity',
  'policy-review',
  'policy-exception',
  'policy-approval',
  'department-compliance',
  'training-completion',
  'access-permission',
  'policy-library-summary',
  'policy-assignment',
]);

const formatFromClient: Record<string, ReportHistoryFormat> = {
  CSV: ReportHistoryFormat.CSV,
  PDF: ReportHistoryFormat.PDF,
  XLS: ReportHistoryFormat.XLS,
  View: ReportHistoryFormat.VIEW,
  VIEW: ReportHistoryFormat.VIEW,
};

const formatToClient: Record<ReportHistoryFormat, string> = {
  CSV: 'CSV',
  PDF: 'PDF',
  XLS: 'XLS',
  VIEW: 'View',
};

const statusFromClient: Record<string, ReportHistoryStatus> = {
  Completed: ReportHistoryStatus.COMPLETED,
  Failed: ReportHistoryStatus.FAILED,
  COMPLETED: ReportHistoryStatus.COMPLETED,
  FAILED: ReportHistoryStatus.FAILED,
};

const statusToClient: Record<ReportHistoryStatus, string> = {
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

@Injectable()
export class ReportHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.reportHistory.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 200,
    });

    return { data: rows.map((row) => this.toResponse(row)) };
  }

  async create(body: Record<string, unknown>) {
    const reportId = this.readString(body.reportId);
    if (!REPORT_IDS.has(reportId)) {
      throw new BadRequestException('reportId is invalid.');
    }

    const name = this.readString(body.name);
    const generatedBy = this.readString(body.generatedBy);
    const dateFrom = this.readString(body.dateFrom);
    const dateTo = this.readString(body.dateTo);
    const format = formatFromClient[this.readString(body.format)];
    const status =
      statusFromClient[this.readString(body.status)] ??
      ReportHistoryStatus.COMPLETED;

    if (!name || !generatedBy || !dateFrom || !dateTo || !format) {
      throw new BadRequestException('Report history details are incomplete.');
    }

    const generatedAt = this.parseDate(body.generatedAt) ?? new Date();
    const rowCount = this.parseRowCount(body.rowCount);

    const created = await this.prisma.reportHistory.create({
      data: {
        reportId,
        name,
        generatedAt,
        generatedBy,
        dateFrom,
        dateTo,
        format,
        status,
        rowCount,
      },
    });

    return { data: this.toResponse(created) };
  }

  async remove(id: string) {
    const existing = await this.prisma.reportHistory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Report history item was not found.');
    }

    await this.prisma.reportHistory.delete({ where: { id } });
    return { data: { id } };
  }

  private toResponse(row: {
    id: string;
    reportId: string;
    name: string;
    generatedAt: Date;
    generatedBy: string;
    dateFrom: string;
    dateTo: string;
    format: ReportHistoryFormat;
    status: ReportHistoryStatus;
    rowCount: number;
  }) {
    return {
      id: row.id,
      reportId: row.reportId,
      name: row.name,
      generatedAt: row.generatedAt.toISOString(),
      generatedBy: row.generatedBy,
      dateFrom: row.dateFrom,
      dateTo: row.dateTo,
      format: formatToClient[row.format],
      status: statusToClient[row.status],
      rowCount: row.rowCount,
    };
  }

  private readString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private parseDate(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseRowCount(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed);
  }
}
