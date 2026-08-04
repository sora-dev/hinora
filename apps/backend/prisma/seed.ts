import {
  CategoryStatus,
  PolicyDocumentType,
  PolicyStatus,
  PrismaClient,
  Role,
  RoleDefinitionType,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roleDefinitions = [
  {
    name: 'Administrator',
    code: 'ADMIN',
    type: RoleDefinitionType.SYSTEM,
    description: 'Full access to all administrative modules.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'Policy Administrator',
    code: 'PADMIN',
    type: RoleDefinitionType.SYSTEM,
    description: 'Manages policies, approvals, and publishing.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'Compliance Officer',
    code: 'COMP',
    type: RoleDefinitionType.SYSTEM,
    description: 'Reviews compliance content and reports.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'Auditor',
    code: 'AUD',
    type: RoleDefinitionType.SYSTEM,
    description: 'Views reports and audit records.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'HR Officer',
    code: 'HR',
    type: RoleDefinitionType.CUSTOM,
    description: 'Manages people-related workflows and acknowledgments.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'Department Head',
    code: 'DH',
    type: RoleDefinitionType.CUSTOM,
    description: 'Leads department-level policy operations.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'IT Specialist',
    code: 'IT',
    type: RoleDefinitionType.CUSTOM,
    description: 'Supports technical operations and selected admin modules.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'User',
    code: 'USER',
    type: RoleDefinitionType.CUSTOM,
    description: 'Standard employee access for policy use.',
    createdBy: 'Hinora Seed',
  },
  {
    name: 'Guest',
    code: 'GST',
    type: RoleDefinitionType.CUSTOM,
    description: 'Very limited read-only access.',
    createdBy: 'Hinora Seed',
  },
] as const;

const moduleKeys = [
  'Dashboard',
  'Policy Library',
  'Categories',
  'Users',
  'Roles & Permissions',
  'Acknowledgments',
  'AI Assistant Analytics',
  'Reports',
  'Audit Logs',
  'Company',
  'Settings',
  'Integrations',
  'System Health',
  'Backup & Restore',
] as const;

const rolePermissionMap: Record<
  (typeof roleDefinitions)[number]['name'],
  Record<
    (typeof moduleKeys)[number],
    {
      canView: boolean | null;
      canCreate: boolean | null;
      canEdit: boolean | null;
      canDelete: boolean | null;
      canApprove: boolean | null;
      canPublish: boolean | null;
    }
  >
> = {
  Administrator: Object.fromEntries(
    moduleKeys.map((moduleKey) => [
      moduleKey,
      {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canPublish: true,
      },
    ]),
  ) as Record<(typeof moduleKeys)[number], {
    canView: boolean | null;
    canCreate: boolean | null;
    canEdit: boolean | null;
    canDelete: boolean | null;
    canApprove: boolean | null;
    canPublish: boolean | null;
  }>,
  'Policy Administrator': {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true, canPublish: true },
    Categories: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: null, canPublish: null },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true, canPublish: false },
    'AI Assistant Analytics': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  'Compliance Officer': {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: true, canDelete: false, canApprove: true, canPublish: false },
    Categories: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: true, canPublish: false },
    'AI Assistant Analytics': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  Auditor: {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Categories: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'AI Assistant Analytics': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  'HR Officer': {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Categories: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true, canPublish: false },
    'AI Assistant Analytics': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  'Department Head': {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: true, canPublish: false },
    Categories: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: true, canPublish: false },
    'AI Assistant Analytics': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  'IT Specialist': {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: true, canDelete: false, canApprove: false, canPublish: false },
    Categories: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'AI Assistant Analytics': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  User: {
    Dashboard: { canView: true, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Categories: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'AI Assistant Analytics': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
  Guest: {
    Dashboard: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Policy Library': { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Categories: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Users: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Roles & Permissions': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Acknowledgments: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'AI Assistant Analytics': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Reports: { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    'Audit Logs': { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canPublish: false },
    Company: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Settings: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    Integrations: { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'System Health': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
    'Backup & Restore': { canView: false, canCreate: null, canEdit: null, canDelete: null, canApprove: null, canPublish: null },
  },
};

const seedUsers = [
  {
    email: 'admin@rbitogon.com',
    username: 'admin.rbitogon',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    department: 'IT Department',
    role: Role.ADMIN,
    roleTitle: 'Administrator',
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2024-05-13T10:24:00Z'),
  },
  {
    email: 'employee@rbitogon.com',
    username: 'john.delacruz',
    password: 'employe123',
    firstName: 'John',
    lastName: 'Dela Cruz',
    department: 'IT Department',
    role: Role.EMPLOYEE,
    roleTitle: 'User',
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2024-05-13T09:15:00Z'),
  },
  {
    email: 'maria.santos@rbitogon.com',
    username: 'maria.santos',
    password: 'TempPass123!',
    firstName: 'Maria',
    lastName: 'Santos',
    department: 'Compliance Department',
    role: Role.MANAGER,
    roleTitle: 'Compliance Officer',
    status: UserStatus.ACTIVE,
    lastLoginAt: new Date('2024-05-13T09:15:00Z'),
  },
  {
    email: 'anna.reyes@rbitogon.com',
    username: 'anna.reyes',
    password: 'TempPass123!',
    firstName: 'Anna',
    lastName: 'Reyes',
    department: 'HR Department',
    role: Role.MANAGER,
    roleTitle: 'HR Officer',
    status: UserStatus.INACTIVE,
    lastLoginAt: new Date('2024-04-28T11:20:00Z'),
  },
  {
    email: 'michael.cruz@rbitogon.com',
    username: 'michael.cruz',
    password: 'TempPass123!',
    firstName: 'Michael',
    lastName: 'Cruz',
    department: 'IT Department',
    role: Role.EMPLOYEE,
    roleTitle: 'IT Specialist',
    status: UserStatus.LOCKED,
    lastLoginAt: new Date('2024-04-15T14:10:00Z'),
  },
] as const;

const seedCategories = [
  {
    code: 'BOARD',
    name: 'Board Governance',
    description: 'Board-level governance and oversight policies.',
    color: '#2563EB',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'Hinora Seed',
  },
  {
    code: 'HR',
    name: 'Human Resources',
    description: 'Employee lifecycle and workplace policies.',
    color: '#F59E0B',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'Hinora Seed',
  },
  {
    code: 'IT',
    name: 'Information Technology',
    description: 'Technology operations and system access policies.',
    color: '#10B981',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'Hinora Seed',
  },
  {
    code: 'INFOSEC',
    name: 'Information Security',
    description: 'Security governance, incident response, and risk protection policies.',
    color: '#7C3AED',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'Hinora Seed',
  },
  {
    code: 'INFOSEC-01',
    name: 'Cybersecurity',
    description: 'Cybersecurity protection, threat prevention, and secure systems.',
    color: '#2563EB',
    status: CategoryStatus.ACTIVE,
    parentCode: 'INFOSEC',
    createdBy: 'Hinora Seed',
    updatedBy: 'Jethro Simbulan',
  },
  {
    code: 'INFOSEC-02',
    name: 'Access Control',
    description: 'Identity and access management standards.',
    color: '#0EA5E9',
    status: CategoryStatus.ACTIVE,
    parentCode: 'INFOSEC',
    createdBy: 'Hinora Seed',
    updatedBy: 'Maria Santos',
  },
  {
    code: 'INFOSEC-03',
    name: 'Endpoint Security',
    description: 'Device hardening and endpoint monitoring policies.',
    color: '#22C55E',
    status: CategoryStatus.ACTIVE,
    parentCode: 'INFOSEC',
    createdBy: 'Hinora Seed',
    updatedBy: 'Maria Santos',
  },
  {
    code: 'COMP',
    name: 'Compliance',
    description: 'Regulatory and internal compliance categories.',
    color: '#0EA5E9',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'Maria Santos',
  },
  {
    code: 'RISK',
    name: 'Risk Management',
    description: 'Risk registers, controls, and mitigation categories.',
    color: '#7C3AED',
    status: CategoryStatus.ACTIVE,
    parentCode: null,
    createdBy: 'Hinora Seed',
    updatedBy: 'John Dela Cruz',
  },
] as const;

const seedPolicies: Array<{
  title: string;
  description: string;
  fileName: string;
  filePath: string;
  fileType: string;
  department: string;
  type: PolicyDocumentType;
  status: PolicyStatus;
  categoryCode: string;
  createdBy: string;
}> = [
  {
    title: 'Information Security Policy',
    description: 'Core security requirements for all employees and systems.',
    fileName: 'information-security-policy.pdf',
    filePath: '/seed/policies/information-security-policy.pdf',
    fileType: 'application/pdf',
    department: 'IT Department',
    type: PolicyDocumentType.POLICY,
    status: PolicyStatus.PUBLISHED,
    categoryCode: 'INFOSEC-01',
    createdBy: 'Jethro Simbulan',
  },
  {
    title: 'Vulnerability Management Policy',
    description: 'Guidelines for identifying, prioritizing, and remediating vulnerabilities.',
    fileName: 'vulnerability-management-policy.pdf',
    filePath: '/seed/policies/vulnerability-management-policy.pdf',
    fileType: 'application/pdf',
    department: 'IT Department',
    type: PolicyDocumentType.POLICY,
    status: PolicyStatus.PUBLISHED,
    categoryCode: 'INFOSEC-01',
    createdBy: 'Maria Santos',
  },
  {
    title: 'Access Provisioning Standard',
    description: 'Process for requesting and approving user access.',
    fileName: 'access-provisioning-standard.pdf',
    filePath: '/seed/policies/access-provisioning-standard.pdf',
    fileType: 'application/pdf',
    department: 'IT Department',
    type: PolicyDocumentType.GUIDELINE,
    status: PolicyStatus.UNDER_REVIEW,
    categoryCode: 'INFOSEC-02',
    createdBy: 'Maria Santos',
  },
  {
    title: 'Endpoint Protection Procedure',
    description: 'Operating procedure for endpoint hardening and protection.',
    fileName: 'endpoint-protection-procedure.pdf',
    filePath: '/seed/policies/endpoint-protection-procedure.pdf',
    fileType: 'application/pdf',
    department: 'Operations',
    type: PolicyDocumentType.PROCEDURE,
    status: PolicyStatus.DRAFT,
    categoryCode: 'INFOSEC-03',
    createdBy: 'John Dela Cruz',
  },
  {
    title: 'Compliance Monitoring Policy',
    description: 'Policy governing compliance monitoring and reporting.',
    fileName: 'compliance-monitoring-policy.pdf',
    filePath: '/seed/policies/compliance-monitoring-policy.pdf',
    fileType: 'application/pdf',
    department: 'Compliance Department',
    type: PolicyDocumentType.POLICY,
    status: PolicyStatus.PUBLISHED,
    categoryCode: 'COMP',
    createdBy: 'Maria Santos',
  },
];

async function main() {
  const rolesByName = new Map<string, string>();
  const categoriesByCode = new Map<string, string>();

  for (const role of roleDefinitions) {
    const createdRole = await prisma.roleDefinition.upsert({
      where: { name: role.name },
      update: {
        code: role.code,
        type: role.type,
        description: role.description,
        createdBy: role.createdBy,
      },
      create: role,
    });

    rolesByName.set(role.name, createdRole.id);

    for (const moduleKey of moduleKeys) {
      const permission = rolePermissionMap[role.name][moduleKey];

      await prisma.roleModulePermission.upsert({
        where: {
          roleId_moduleKey: {
            roleId: createdRole.id,
            moduleKey,
          },
        },
        update: permission,
        create: {
          roleId: createdRole.id,
          moduleKey,
          ...permission,
        },
      });
    }
  }

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    if (!rolesByName.has(user.roleTitle)) {
      throw new Error(`Missing seeded role for user role title: ${user.roleTitle}`);
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        password: passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        role: user.role,
        roleTitle: user.roleTitle,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      create: {
        email: user.email,
        username: user.username,
        password: passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        role: user.role,
        roleTitle: user.roleTitle,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    });
  }

  for (const category of seedCategories.filter((item) => item.parentCode === null)) {
    const createdCategory = await prisma.category.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        color: category.color,
        status: category.status,
        parentId: null,
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      },
      create: {
        name: category.name,
        code: category.code,
        description: category.description,
        color: category.color,
        status: category.status,
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      },
    });

    categoriesByCode.set(category.code, createdCategory.id);
  }

  for (const category of seedCategories.filter((item) => item.parentCode !== null)) {
    const parentId = categoriesByCode.get(category.parentCode);

    if (!parentId) {
      throw new Error(`Missing seeded parent category for code: ${category.parentCode}`);
    }

    const createdCategory = await prisma.category.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        color: category.color,
        status: category.status,
        parentId,
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      },
      create: {
        name: category.name,
        code: category.code,
        description: category.description,
        color: category.color,
        status: category.status,
        parentId,
        createdBy: category.createdBy,
        updatedBy: category.updatedBy,
      },
    });

    categoriesByCode.set(category.code, createdCategory.id);
  }

  for (const policy of seedPolicies) {
    const categoryId = categoriesByCode.get(policy.categoryCode);

    if (!categoryId) {
      throw new Error(`Missing seeded category for policy: ${policy.title}`);
    }

    await prisma.policy.upsert({
      where: { filePath: policy.filePath },
      update: {
        title: policy.title,
        description: policy.description,
        fileName: policy.fileName,
        fileType: policy.fileType,
        department: policy.department,
        type: policy.type,
        status: policy.status,
        createdBy: policy.createdBy,
        categoryId,
        isActive: policy.status !== PolicyStatus.ARCHIVED,
      },
      create: {
        title: policy.title,
        description: policy.description,
        fileName: policy.fileName,
        filePath: policy.filePath,
        fileType: policy.fileType,
        department: policy.department,
        type: policy.type,
        status: policy.status,
        createdBy: policy.createdBy,
        categoryId,
        isActive: policy.status !== PolicyStatus.ARCHIVED,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Failed to seed data', error);
    await prisma.$disconnect();
    process.exit(1);
  });
