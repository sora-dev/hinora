import { AuditAction, AuditEventStatus } from '@prisma/client';

export type AuditEventDraft = {
  action: AuditAction;
  module: string;
  resourceType: string;
  resource: string;
  details: string;
  status: AuditEventStatus;
};

type RequestFile = {
  originalname?: string;
};

type EventContext = {
  method: string;
  path: string;
  body: Record<string, unknown>;
  file?: RequestFile;
  result: unknown;
  error: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function dig(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    const record = asRecord(current);
    return record ? record[key] : undefined;
  }, value);
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = readString(value);
    if (text) {
      return text;
    }
  }
  return '';
}

function resultRecord(result: unknown) {
  return asRecord(result);
}

export function shouldSkipAudit(method: string, path: string) {
  const verb = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)) {
    return true;
  }

  if (
    path === '/auth/sessions/touch' ||
    path.startsWith('/reading-progress') ||
    path === '/audit-logs' ||
    path.startsWith('/audit-logs/')
  ) {
    return true;
  }

  return false;
}

export function describeAuditEvent(context: EventContext): AuditEventDraft {
  const failed = Boolean(context.error);
  const status = failed ? AuditEventStatus.FAILED : AuditEventStatus.SUCCESS;
  const mapped = matchRoute(context);

  return {
    ...mapped,
    status,
    resource: mapped.resource || fallbackResource(context),
    details: failed
      ? errorDetails(context.error, mapped.details)
      : mapped.details,
  };
}

function matchRoute(context: EventContext): Omit<AuditEventDraft, 'status'> {
  const { method, path } = context;
  const result = resultRecord(context.result);
  const user = asRecord(result?.user) ?? asRecord(dig(context.result, 'user'));

  if (method === 'POST' && path === '/auth/login') {
    const failed = Boolean(context.error);
    return {
      action: failed ? AuditAction.FAILED_LOGIN : AuditAction.LOGIN,
      module: 'Authentication',
      resourceType: 'Session',
      resource: firstString(
        user?.email,
        user?.username,
        context.body.email,
      ),
      details: failed ? 'Invalid credentials' : 'User logged in',
    };
  }

  if (method === 'POST' && path === '/auth/logout') {
    return {
      action: AuditAction.LOGOUT,
      module: 'Authentication',
      resourceType: 'Session',
      resource: firstString(context.body.userId),
      details: 'User logged out',
    };
  }

  if (method === 'POST' && path === '/auth/activity/export') {
    return {
      action: AuditAction.EXPORT,
      module: 'Reports',
      resourceType: 'Report',
      resource: 'User Activity Report',
      details: 'Account activity exported',
    };
  }

  if (method === 'POST' && path === '/auth/sessions/revoke-others') {
    return {
      action: AuditAction.UPDATE,
      module: 'Authentication',
      resourceType: 'Session',
      resource: 'Other devices',
      details: 'All other signed-in devices were signed out',
    };
  }

  if (method === 'POST' && /^\/auth\/sessions\/[^/]+\/revoke$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Authentication',
      resourceType: 'Session',
      resource: path.split('/')[3] ?? 'Session',
      details: 'Device session signed out',
    };
  }

  if (method === 'POST' && path === '/users/import') {
    const count =
      typeof result?.count === 'number'
        ? result.count
        : Array.isArray(context.body.users)
          ? context.body.users.length
          : 0;
    return {
      action: AuditAction.CREATE,
      module: 'Users',
      resourceType: 'User',
      resource: count ? `${count} users` : 'User import',
      details: count ? `Imported ${count} users` : 'Users imported',
    };
  }

  if (method === 'POST' && path === '/users') {
    return {
      action: AuditAction.CREATE,
      module: 'Users',
      resourceType: 'User',
      resource: firstString(result?.email, result?.fullName, context.body.email),
      details: 'User created',
    };
  }

  if (method === 'PATCH' && /^\/users\/[^/]+\/password$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'User',
      resource: firstString(result?.email, result?.fullName),
      details: 'Password changed',
    };
  }

  if (method === 'PATCH' && /^\/users\/[^/]+\/status$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'User',
      resource: firstString(result?.email, result?.fullName),
      details: firstString(context.body.status)
        ? `User status changed to ${readString(context.body.status)}`
        : 'User status updated',
    };
  }

  if (method === 'PATCH' && /^\/users\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'User',
      resource: firstString(result?.email, result?.fullName, context.body.email),
      details: 'User updated',
    };
  }

  if (method === 'POST' && path === '/policies/upload') {
    return {
      action: AuditAction.CREATE,
      module: 'Policies',
      resourceType: 'Policy',
      resource: firstString(
        result?.title,
        context.body.title,
        context.file?.originalname,
      ),
      details: 'Policy uploaded',
    };
  }

  if (method === 'PATCH' && /^\/policies\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Policies',
      resourceType: 'Policy',
      resource: firstString(
        result?.title,
        context.body.title,
        context.file?.originalname,
      ),
      details: context.file?.originalname
        ? 'Policy version updated'
        : 'Policy updated',
    };
  }

  if (method === 'POST' && /^\/policies\/[^/]+\/reanalyze$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Policies',
      resourceType: 'Policy',
      resource: firstString(result?.title, context.body.title),
      details: 'Policy reanalyzed',
    };
  }

  if (path.startsWith('/categories')) {
    return crudEvent(context, {
      module: 'Categories',
      resourceType: 'Category',
      created: 'Category created',
      updated: path.endsWith('/status')
        ? 'Category status updated'
        : 'Category updated',
      deleted: 'Category deleted',
    });
  }

  if (path.startsWith('/departments')) {
    return crudEvent(context, {
      module: 'Departments',
      resourceType: 'Department',
      created: 'Department created',
      updated: 'Department updated',
      deleted: 'Department deleted',
    });
  }

  if (path.startsWith('/organization-settings')) {
    return {
      action: AuditAction.UPDATE,
      module: 'Settings',
      resourceType: 'Organization',
      resource: firstString(
        dig(context.result, 'data.organizationName'),
        context.body.organizationName,
        'Organization Settings',
      ),
      details: 'Organization settings updated',
    };
  }

  if (path.startsWith('/report-history')) {
    return crudEvent(context, {
      module: 'Reports',
      resourceType: 'Report',
      created: 'Report history recorded',
      updated: 'Report history updated',
      deleted: 'Report history deleted',
    });
  }

  if (path.startsWith('/locations')) {
    return crudEvent(context, {
      module: 'Locations',
      resourceType: 'Location',
      created: 'Location created',
      updated: 'Location updated',
      deleted: 'Location deleted',
    });
  }

  if (method === 'POST' && path === '/roles-permissions/roles') {
    return {
      action: AuditAction.CREATE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title, context.body.name),
      details: 'Role created',
    };
  }

  if (method === 'POST' && /^\/roles-permissions\/roles\/[^/]+\/clone$/.test(path)) {
    return {
      action: AuditAction.CREATE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title),
      details: 'Role cloned',
    };
  }

  if (method === 'DELETE' && /^\/roles-permissions\/roles\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.DELETE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title),
      details: 'Role deleted',
    };
  }

  if (method === 'PATCH' && /^\/roles-permissions\/roles\/[^/]+\/permissions$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title),
      details: 'Role permissions updated',
    };
  }

  if (method === 'PATCH' && /^\/roles-permissions\/roles\/[^/]+\/view$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title),
      details: 'Role view access updated',
    };
  }

  if (method === 'PATCH' && /^\/roles-permissions\/roles\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Users',
      resourceType: 'Role',
      resource: firstString(result?.name, result?.title, context.body.name),
      details: 'Role updated',
    };
  }

  if (path.startsWith('/notifications/inbox')) {
    const isReadAll = path.endsWith('/read-all');
    const isRead = path.endsWith('/read');
    return {
      action: method === 'DELETE' ? AuditAction.DELETE : AuditAction.UPDATE,
      module: 'Notifications',
      resourceType: 'Notification',
      resource: firstString(result?.title, result?.id, path.split('/')[3]),
      details: isReadAll
        ? 'Marked all notifications as read'
        : isRead
          ? 'Notification read status updated'
          : method === 'DELETE'
            ? 'Notification removed'
            : 'Notification inbox updated',
    };
  }

  if (path.startsWith('/compliance/policies/') && path.includes('/notifications')) {
    const isSend = path.endsWith('/send');
    const isRule = path.includes('/rules');
    return {
      action: method === 'DELETE' ? AuditAction.DELETE : method === 'POST' ? AuditAction.CREATE : AuditAction.UPDATE,
      module: 'Compliance',
      resourceType: 'Notification',
      resource: firstString(result?.name, context.body.name, path.split('/')[3]),
      details: isSend
        ? 'Compliance notification sent'
        : isRule && method === 'DELETE'
          ? 'Notification rule removed'
          : isRule && method === 'POST'
            ? 'Notification rule created'
            : isRule
              ? 'Notification rule updated'
              : 'Compliance notification updated',
    };
  }

  if (path.startsWith('/policy-assignments')) {
    return crudEvent(context, {
      module: 'Policies',
      resourceType: 'Policy',
      created: 'Policy assigned',
      updated: path.endsWith('/status')
        ? 'Policy assignment status updated'
        : path.endsWith('/duplicate')
          ? 'Policy assignment duplicated'
          : 'Policy assignment updated',
      deleted: 'Policy assignment removed',
    });
  }

  if (method === 'PUT' && /^\/assessments\/policy\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.UPDATE,
      module: 'Assessments',
      resourceType: 'Assessment',
      resource: firstString(result?.title, result?.policyTitle, path.split('/')[3]),
      details: 'Assessment saved',
    };
  }

  if (method === 'DELETE' && /^\/assessments\/policy\/[^/]+$/.test(path)) {
    return {
      action: AuditAction.DELETE,
      module: 'Assessments',
      resourceType: 'Assessment',
      resource: path.split('/')[3] ?? 'Assessment',
      details: 'Assessment deleted',
    };
  }

  return {
    action: methodAction(method),
    module: moduleFromPath(path),
    resourceType: resourceTypeFromPath(path),
    resource: fallbackResource(context),
    details: `${method} ${path}`,
  };
}

function crudEvent(
  context: EventContext,
  copy: {
    module: string;
    resourceType: string;
    created: string;
    updated: string;
    deleted: string;
  },
): Omit<AuditEventDraft, 'status'> {
  const result = resultRecord(context.result);
  const resource = firstString(
    result?.name,
    result?.title,
    result?.policyTitle,
    result?.code,
    context.body.name,
    context.body.title,
    context.body.code,
  );

  if (context.method === 'POST') {
    return {
      action: AuditAction.CREATE,
      module: copy.module,
      resourceType: copy.resourceType,
      resource,
      details: copy.created,
    };
  }

  if (context.method === 'DELETE') {
    return {
      action: AuditAction.DELETE,
      module: copy.module,
      resourceType: copy.resourceType,
      resource,
      details: copy.deleted,
    };
  }

  return {
    action: AuditAction.UPDATE,
    module: copy.module,
    resourceType: copy.resourceType,
    resource,
    details: copy.updated,
  };
}

function methodAction(method: string): AuditAction {
  if (method === 'POST') return AuditAction.CREATE;
  if (method === 'DELETE') return AuditAction.DELETE;
  return AuditAction.UPDATE;
}

function moduleFromPath(path: string) {
  const segment = path.split('/').filter(Boolean)[0] ?? 'System';
  const labels: Record<string, string> = {
    auth: 'Authentication',
    users: 'Users',
    policies: 'Policies',
    'policy-assignments': 'Policies',
    categories: 'Categories',
    departments: 'Departments',
    locations: 'Locations',
    'organization-settings': 'Settings',
    'report-history': 'Reports',
    assessments: 'Assessments',
    compliance: 'Compliance',
    'roles-permissions': 'Users',
  };
  return labels[segment] ?? titleCase(segment);
}

function resourceTypeFromPath(path: string) {
  const segment = path.split('/').filter(Boolean)[0] ?? 'Resource';
  const labels: Record<string, string> = {
    auth: 'Session',
    users: 'User',
    policies: 'Policy',
    'policy-assignments': 'Policy',
    categories: 'Category',
    departments: 'Department',
    locations: 'Location',
    'organization-settings': 'Organization',
    'report-history': 'Report',
    assessments: 'Assessment',
    compliance: 'Compliance',
    'roles-permissions': 'Role',
  };
  return labels[segment] ?? titleCase(segment.replace(/s$/, ''));
}

function fallbackResource(context: EventContext) {
  const result = resultRecord(context.result);
  return firstString(
    result?.title,
    result?.name,
    result?.email,
    result?.fullName,
    result?.fileName,
    context.body.title,
    context.body.name,
    context.body.email,
    context.file?.originalname,
    context.path,
  );
}

function errorDetails(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = readString((error as { message?: unknown }).message);
    if (message) {
      return message;
    }
  }
  return fallback || 'Request failed';
}

function titleCase(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
