import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryStatus, Prisma, type Category, type Policy } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CategoryTreeQuery = Record<string, string | undefined>;

type CategoryWithPolicies = Category & {
  policies: Pick<Policy, 'id' | 'department'>[];
};

type CategoryDetailRecord = Category & {
  parent: Category | null;
  children: Category[];
  policies: Policy[];
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(query: CategoryTreeQuery) {
    const search = this.normalizeOptionalString(query.search);
    const status = this.parseOptionalStatus(query.status);

    const categories = await this.prisma.category.findMany({
      include: {
        policies: {
          select: {
            id: true,
            department: true,
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });

    const tree = this.buildTree(categories);
    const filteredTree = this.filterTree(tree, search, status);

    return {
      data: filteredTree,
      total: this.countNodes(filteredTree),
    };
  }

  async listOptions() {
    const categories = await this.prisma.category.findMany({
      where: {
        status: CategoryStatus.ACTIVE,
      },
      orderBy: [{ name: 'asc' }],
    });

    return {
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        code: category.code,
        parentId: category.parentId,
      })),
    };
  }

  async getCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        children: {
          orderBy: { name: 'asc' },
        },
        policies: {
          orderBy: [{ updatedAt: 'desc' }],
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    return {
      data: this.toCategoryDetail(category),
    };
  }

  async createCategory(body: Record<string, unknown>) {
    const parentId = this.parseOptionalParentId(body.parentId);
    const data = await this.buildCreateOrUpdateInput(body, parentId);

    try {
      const category = await this.prisma.category.create({
        data,
      });

      return this.getCategory(category.id);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateCategory(categoryId: string, body: Record<string, unknown>) {
    const existingCategory = await this.ensureCategoryExists(categoryId);
    const nextParentId =
      body.parentId === undefined
        ? existingCategory.parentId
        : this.parseOptionalParentId(body.parentId);

    if (nextParentId === categoryId) {
      throw new BadRequestException('A category cannot be its own parent.');
    }

    const data = await this.buildCreateOrUpdateInput(body, nextParentId, existingCategory);

    try {
      await this.prisma.category.update({
        where: { id: categoryId },
        data,
      });

      return this.getCategory(categoryId);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateStatus(categoryId: string, body: Record<string, unknown>) {
    await this.ensureCategoryExists(categoryId);
    const status = this.parseRequiredStatus(body.status);

    await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        status,
        updatedBy:
          this.normalizeOptionalString(body.updatedBy) ?? 'John Dela Cruz',
      },
    });

    return this.getCategory(categoryId);
  }

  async deleteCategory(categoryId: string) {
    const category = await this.ensureCategoryExists(categoryId);

    const [childCount, policyCount] = await Promise.all([
      this.prisma.category.count({
        where: { parentId: category.id },
      }),
      this.prisma.policy.count({
        where: { categoryId: category.id },
      }),
    ]);

    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has subcategories.',
      );
    }

    if (policyCount > 0) {
      throw new BadRequestException(
        'Cannot delete a category that still has associated policies.',
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return {
      success: true,
      deletedId: categoryId,
    };
  }

  private buildTree(categories: CategoryWithPolicies[]) {
    const categoryMap = new Map<string, CategoryWithPolicies & { children: CategoryWithPolicies[] }>();
    const roots: Array<CategoryWithPolicies & { children: CategoryWithPolicies[] }> = [];

    for (const category of categories) {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    for (const category of categoryMap.values()) {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(category);
          continue;
        }
      }
      roots.push(category);
    }

    return roots.map((root) => this.toCategoryTreeNode(root));
  }

  private filterTree(
    nodes: Array<ReturnType<CategoriesService['toCategoryTreeNode']>>,
    search: string | null,
    status: CategoryStatus | null,
  ) {
    return nodes
      .map((node) => {
        const children = this.filterTree(node.children, search, status);
        const matchesStatus = status ? node.status === status : true;
        const matchesSearch = search
          ? `${node.name} ${node.code} ${node.description ?? ''}`
              .toLowerCase()
              .includes(search.toLowerCase())
          : true;

        if (!matchesStatus || (!matchesSearch && children.length === 0)) {
          return null;
        }

        return {
          ...node,
          children,
        };
      })
      .filter(Boolean) as Array<ReturnType<CategoriesService['toCategoryTreeNode']>>;
  }

  private countNodes<T extends { children: T[] }>(nodes: T[]) {
    return nodes.reduce((count, node) => count + 1 + this.countNodes(node.children), 0);
  }

  private toCategoryTreeNode(
    category: CategoryWithPolicies & { children: CategoryWithPolicies[] },
  ) {
    return {
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      parentId: category.parentId,
      status: category.status,
      color: category.color,
      createdAt: category.createdAt,
      createdBy: category.createdBy,
      updatedAt: category.updatedAt,
      updatedBy: category.updatedBy,
      policyCount: category.policies.length,
      documentCount: category.policies.length,
      assignedDepartments: new Set(category.policies.map((policy) => policy.department))
        .size,
      children: category.children
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((child) =>
          this.toCategoryTreeNode({
            ...child,
            children: (child as CategoryWithPolicies & { children?: CategoryWithPolicies[] })
              .children ?? [],
          }),
        ),
    };
  }

  private toCategoryDetail(category: CategoryDetailRecord) {
    return {
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      parentId: category.parentId,
      parentName: category.parent?.name ?? null,
      status: category.status,
      color: category.color,
      createdAt: category.createdAt,
      createdBy: category.createdBy,
      updatedAt: category.updatedAt,
      updatedBy: category.updatedBy,
      policyCount: category.policies.length,
      documentCount: category.policies.length,
      assignedDepartments: new Set(
        category.policies.map((policy) => policy.department),
      ).size,
      childrenCount: category.children.length,
      policies: category.policies.map((policy) => ({
        id: policy.id,
        title: policy.title,
        type: this.labelizePolicyType(policy.type),
        status: this.labelizePolicyStatus(policy.status),
        updatedAt: policy.updatedAt,
        updatedBy: policy.createdBy,
      })),
    };
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    return category;
  }

  private async buildCreateOrUpdateInput(
    body: Record<string, unknown>,
    parentId: string | null,
    existingCategory?: Category,
  ) {
    const name =
      body.name === undefined
        ? existingCategory?.name
        : this.readRequiredString(body.name, 'name');
    const code =
      body.code === undefined
        ? existingCategory?.code
        : this.readRequiredString(body.code, 'code').toUpperCase();
    const description =
      body.description === undefined
        ? existingCategory?.description ?? null
        : this.normalizeOptionalString(body.description);
    const color =
      body.color === undefined
        ? existingCategory?.color ?? '#2563EB'
        : this.readRequiredString(body.color, 'color');
    const status =
      body.status === undefined
        ? existingCategory?.status ?? CategoryStatus.ACTIVE
        : this.parseRequiredStatus(body.status);
    const createdBy =
      existingCategory?.createdBy ??
      this.normalizeOptionalString(body.createdBy) ??
      'John Dela Cruz';
    const updatedBy =
      this.normalizeOptionalString(body.updatedBy) ?? 'John Dela Cruz';

    if (!name || !code) {
      throw new BadRequestException('name and code are required.');
    }

    if (parentId) {
      await this.ensureCategoryExists(parentId);
    }

    return {
      name,
      code,
      description,
      color,
      status,
      parentId,
      createdBy,
      updatedBy,
    };
  }

  private parseRequiredStatus(value: unknown) {
    if (value !== CategoryStatus.ACTIVE && value !== CategoryStatus.INACTIVE) {
      throw new BadRequestException(
        'status must be either ACTIVE or INACTIVE.',
      );
    }

    return value;
  }

  private parseOptionalStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.parseRequiredStatus(value);
  }

  private parseOptionalParentId(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.readRequiredString(value, 'parentId');
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private labelizePolicyType(value: Policy['type']) {
    return value[0] + value.slice(1).toLowerCase();
  }

  private labelizePolicyStatus(value: Policy['status']) {
    return value
      .split('_')
      .map((part) => part[0] + part.slice(1).toLowerCase())
      .join(' ');
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A category with the same unique value already exists.',
        );
      }
    }

    throw error;
  }
}
