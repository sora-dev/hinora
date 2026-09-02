-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "organizationName" TEXT NOT NULL,
    "organizationCode" TEXT NOT NULL,
    "organizationAddress" TEXT NOT NULL DEFAULT '',
    "organizationPhone" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT,
    "timeZone" TEXT NOT NULL,
    "dateFormat" TEXT NOT NULL,
    "timeFormat" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "landingPage" TEXT NOT NULL,
    "policyVisibility" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row used by Settings.
INSERT INTO "OrganizationSettings" (
    "id",
    "organizationName",
    "organizationCode",
    "organizationAddress",
    "organizationPhone",
    "logoUrl",
    "timeZone",
    "dateFormat",
    "timeFormat",
    "language",
    "landingPage",
    "policyVisibility",
    "createdAt",
    "updatedAt"
) VALUES (
    'default',
    'Rural Bank of Hinora',
    'RBH',
    E'Main Corporate Office\nLa Trinidad, Benguet 2601\nPhilippines',
    '+63 74 422 1000',
    '/branding/hinora-logo-icon.png',
    'asia-manila',
    'mm-dd-yyyy',
    '12h',
    'en-ph',
    'dashboard',
    'assigned',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
