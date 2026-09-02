import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PolicyDocumentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const bookmarkInclude = {
  policy: {
    select: {
      id: true,
      title: true,
      type: true,
      department: true,
      version: true,
      category: { select: { name: true } },
    },
  },
  collection: { select: { id: true, name: true } },
} satisfies Prisma.PolicyBookmarkInclude;

type BookmarkRow = Prisma.PolicyBookmarkGetPayload<{ include: typeof bookmarkInclude }>;

@Injectable()
export class BookmarksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: Record<string, string | undefined>) {
    await this.assertUser(userId);

    const search = query.search?.trim() ?? '';
    const type = this.readType(query.type);
    const collectionId = query.collectionId?.trim() || undefined;
    const sort = this.readSort(query.sort);
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(48, Math.max(1, Number(query.pageSize) || 12));

    const where: Prisma.PolicyBookmarkWhereInput = {
      userId,
      ...(type ? { policy: { type } } : {}),
      ...(collectionId === 'none'
        ? { collectionId: null }
        : collectionId
          ? { collectionId }
          : {}),
      ...(search
        ? {
            OR: [
              { policy: { title: { contains: search, mode: 'insensitive' } } },
              { policy: { department: { contains: search, mode: 'insensitive' } } },
              { policy: { category: { name: { contains: search, mode: 'insensitive' } } } },
              { collection: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PolicyBookmarkOrderByWithRelationInput =
      sort === 'title'
        ? { policy: { title: 'asc' } }
        : sort === 'type'
          ? { policy: { type: 'asc' } }
          : { createdAt: 'desc' };

    const [rows, total, collections] = await Promise.all([
      this.prisma.policyBookmark.findMany({
        where,
        include: bookmarkInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.policyBookmark.count({ where }),
      this.listCollections(userId),
    ]);

    return {
      items: rows.map((row) => this.toItem(row)),
      collections: collections.collections,
      uncategorized: collections.uncategorized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async ids(userId: string) {
    await this.assertUser(userId);
    const rows = await this.prisma.policyBookmark.findMany({
      where: { userId },
      select: { policyId: true },
    });
    return { policyIds: rows.map((row) => row.policyId) };
  }

  async status(userId: string, policyId: string) {
    await this.assertUser(userId);
    const id = policyId.trim();
    if (!id) throw new BadRequestException('policyId is required.');
    const row = await this.prisma.policyBookmark.findUnique({
      where: { userId_policyId: { userId, policyId: id } },
      select: { id: true },
    });
    return { bookmarked: Boolean(row), id: row?.id ?? null };
  }

  async listCollections(userId: string) {
    await this.assertUser(userId);
    const rows = await this.prisma.bookmarkCollection.findMany({
      where: { userId },
      include: { _count: { select: { bookmarks: true } } },
      orderBy: { name: 'asc' },
    });
    const uncategorized = await this.prisma.policyBookmark.count({
      where: { userId, collectionId: null },
    });
    return {
      collections: rows.map((row) => this.toCollection(row)),
      uncategorized,
    };
  }

  async create(userId: string, body: Record<string, unknown>) {
    await this.assertUser(userId);
    const policyId = typeof body.policyId === 'string' ? body.policyId.trim() : '';
    if (!policyId) throw new BadRequestException('policyId is required.');

    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true },
    });
    if (!policy) throw new NotFoundException('Policy was not found.');

    const collectionId = await this.resolveCollectionId(userId, body.collectionId);

    const existing = await this.prisma.policyBookmark.findUnique({
      where: { userId_policyId: { userId, policyId } },
      include: bookmarkInclude,
    });
    if (existing) {
      if (collectionId !== undefined && existing.collectionId !== collectionId) {
        const updated = await this.prisma.policyBookmark.update({
          where: { id: existing.id },
          data: { collectionId },
          include: bookmarkInclude,
        });
        return { data: this.toItem(updated) };
      }
      return { data: this.toItem(existing) };
    }

    const created = await this.prisma.policyBookmark.create({
      data: { userId, policyId, collectionId: collectionId ?? null },
      include: bookmarkInclude,
    });
    return { data: this.toItem(created) };
  }

  async update(userId: string, id: string, body: Record<string, unknown>) {
    const row = await this.findOwned(userId, id);
    const collectionId = await this.resolveCollectionId(userId, body.collectionId);
    const updated = await this.prisma.policyBookmark.update({
      where: { id: row.id },
      data: { collectionId: collectionId ?? null },
      include: bookmarkInclude,
    });
    return { data: this.toItem(updated) };
  }

  async remove(userId: string, id: string) {
    const row = await this.findOwned(userId, id);
    await this.prisma.policyBookmark.delete({ where: { id: row.id } });
    return { data: { id: row.id, policyId: row.policyId } };
  }

  async removeByPolicy(userId: string, policyId: string) {
    await this.assertUser(userId);
    const id = policyId.trim();
    if (!id) throw new BadRequestException('policyId is required.');
    const row = await this.prisma.policyBookmark.findUnique({
      where: { userId_policyId: { userId, policyId: id } },
      select: { id: true, policyId: true },
    });
    if (!row) return { data: { id: null, policyId: id } };
    await this.prisma.policyBookmark.delete({ where: { id: row.id } });
    return { data: { id: row.id, policyId: row.policyId } };
  }

  async createCollection(userId: string, body: Record<string, unknown>) {
    await this.assertUser(userId);
    const name = this.readName(body.name);
    const existing = await this.prisma.bookmarkCollection.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new BadRequestException('A collection with that name already exists.');

    const created = await this.prisma.bookmarkCollection.create({
      data: { userId, name },
      include: { _count: { select: { bookmarks: true } } },
    });
    return { data: this.toCollection(created) };
  }

  async updateCollection(userId: string, id: string, body: Record<string, unknown>) {
    const row = await this.findOwnedCollection(userId, id);
    const name = body.name !== undefined ? this.readName(body.name) : row.name;
    const clash = await this.prisma.bookmarkCollection.findFirst({
      where: {
        userId,
        id: { not: row.id },
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (clash) throw new BadRequestException('A collection with that name already exists.');

    const updated = await this.prisma.bookmarkCollection.update({
      where: { id: row.id },
      data: { name },
      include: { _count: { select: { bookmarks: true } } },
    });
    return { data: this.toCollection(updated) };
  }

  async removeCollection(userId: string, id: string) {
    const row = await this.findOwnedCollection(userId, id);
    await this.prisma.bookmarkCollection.delete({ where: { id: row.id } });
    return { data: { id: row.id } };
  }

  private async findOwned(userId: string, id: string) {
    await this.assertUser(userId);
    const row = await this.prisma.policyBookmark.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Bookmark was not found.');
    return row;
  }

  private async findOwnedCollection(userId: string, id: string) {
    await this.assertUser(userId);
    const row = await this.prisma.bookmarkCollection.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Collection was not found.');
    return row;
  }

  private async resolveCollectionId(userId: string, value: unknown) {
    if (value === undefined) return undefined;
    if (value === null || value === '' || value === 'none') return null;
    if (typeof value !== 'string') throw new BadRequestException('collectionId is invalid.');
    const collection = await this.prisma.bookmarkCollection.findFirst({
      where: { id: value.trim(), userId },
      select: { id: true },
    });
    if (!collection) throw new BadRequestException('Collection was not found.');
    return collection.id;
  }

  private async assertUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Signed-in user was not found.');
    return user;
  }

  private readType(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return (Object.values(PolicyDocumentType) as string[]).includes(normalized)
      ? (normalized as PolicyDocumentType)
      : undefined;
  }

  private readSort(value?: string) {
    if (value === 'title' || value === 'type') return value;
    return 'recent';
  }

  private readName(value: unknown) {
    const name = typeof value === 'string' ? value.trim() : '';
    if (!name) throw new BadRequestException('Collection name is required.');
    if (name.length > 48) throw new BadRequestException('Collection name is too long.');
    return name;
  }

  private defaultDescription(name: string) {
    const key = name.trim().toLowerCase();
    if (key.includes('compliance')) {
      return 'Policies and documents related to compliance and regulations.';
    }
    if (key.includes('security')) {
      return 'Information security policies, standards, and procedures.';
    }
    if (key.includes('training')) {
      return 'Training materials, guides, and learning resources.';
    }
    return 'Saved policies grouped for quicker access.';
  }

  private toCollection(row: {
    id: string;
    name: string;
    createdAt: Date;
    _count: { bookmarks: number };
  }) {
    return {
      id: row.id,
      name: row.name,
      description: this.defaultDescription(row.name),
      count: row._count.bookmarks,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toItem(row: BookmarkRow) {
    return {
      id: row.id,
      policyId: row.policyId,
      title: row.policy.title,
      type: row.policy.type,
      typeLabel: this.typeLabel(row.policy.type, row.policy.title),
      department: row.policy.department,
      categoryName: row.policy.category?.name ?? row.policy.department,
      version: row.policy.version,
      collectionId: row.collectionId,
      collectionName: row.collection?.name ?? null,
      bookmarkedAt: row.createdAt.toISOString(),
    };
  }

  private typeLabel(type: PolicyDocumentType, title: string) {
    if (type === PolicyDocumentType.PROCEDURE) return 'Procedure';
    if (type === PolicyDocumentType.GUIDELINE) {
      return /standard/i.test(title) ? 'Standard' : 'Guideline';
    }
    if (/training/i.test(title)) return 'Training';
    if (/checklist|document/i.test(title)) return 'Document';
    return 'Policy';
  }
}
