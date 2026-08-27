export type LocationStatus = "Active" | "Maintenance" | "Inactive";

export type LocationManager = {
  id?: string;
  name: string;
  email: string;
  initials: string;
  jobTitle?: string | null;
};

export type LocationRecord = {
  id: string;
  name: string;
  code: string;
  subtitle: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  description: string;
  manager: LocationManager;
  employees: number;
  departments: number;
  status: LocationStatus;
};

export const ORGANIZATION_WIDE_SCOPE = "organization-wide" as const;

export const MOCK_LOCATIONS: LocationRecord[] = [
  {
    id: "location-head-office",
    name: "Head Office",
    code: "HO",
    subtitle: "Main Corporate Office, La Trinidad, Benguet",
    streetAddress: "Main Corporate Office",
    city: "La Trinidad",
    province: "Benguet",
    postalCode: "2601",
    email: "headoffice@hinora.com",
    phone: "+63 74 422 1000",
    description: "Primary corporate headquarters for company-wide operations and governance.",
    manager: {
      name: "John Dela Cruz",
      email: "john.delacruz@hinora.com",
      initials: "JD",
      jobTitle: "Location Manager",
    },
    employees: 32,
    departments: 8,
    status: "Active",
  },
  {
    id: "location-baguio",
    name: "Baguio",
    code: "BAG",
    subtitle: "Session Road, Baguio City",
    streetAddress: "Session Road",
    city: "Baguio City",
    province: "Benguet",
    postalCode: "2600",
    email: "baguio@hinora.com",
    phone: "+63 74 442 2200",
    description: "Northern Luzon regional office supporting local operations and client services.",
    manager: {
      name: "Maria Santos",
      email: "maria.santos@hinora.com",
      initials: "MS",
      jobTitle: "Location Manager",
    },
    employees: 18,
    departments: 5,
    status: "Active",
  },
  {
    id: "location-la-trinidad",
    name: "La Trinidad",
    code: "LTR",
    subtitle: "Km 5, La Trinidad, Benguet",
    streetAddress: "Km 5",
    city: "La Trinidad",
    province: "Benguet",
    postalCode: "2601",
    email: "latrinidad@hinora.com",
    phone: "+63 74 422 3300",
    description: "Satellite office currently under facility maintenance and staffing adjustments.",
    manager: {
      name: "Roberto Cruz",
      email: "roberto.cruz@hinora.com",
      initials: "RC",
      jobTitle: "Acting Location Manager",
    },
    employees: 12,
    departments: 4,
    status: "Maintenance",
  },
  {
    id: "location-cebu",
    name: "Cebu",
    code: "CEB",
    subtitle: "IT Park, Cebu City",
    streetAddress: "IT Park",
    city: "Cebu City",
    province: "Cebu",
    postalCode: "6000",
    email: "cebu@hinora.com",
    phone: "+63 32 888 4400",
    description: "Visayas hub for operations, customer support, and regional compliance.",
    manager: {
      name: "Ana Reyes",
      email: "ana.reyes@hinora.com",
      initials: "AR",
      jobTitle: "Location Manager",
    },
    employees: 21,
    departments: 6,
    status: "Active",
  },
  {
    id: "location-davao",
    name: "Davao",
    code: "DAV",
    subtitle: "JP Laurel Ave, Davao City",
    streetAddress: "JP Laurel Ave",
    city: "Davao City",
    province: "Davao del Sur",
    postalCode: "8000",
    email: "davao@hinora.com",
    phone: "+63 82 221 5500",
    description: "Mindanao regional location covering southern operations.",
    manager: {
      name: "Carlos Mendoza",
      email: "carlos.mendoza@hinora.com",
      initials: "CM",
      jobTitle: "Location Manager",
    },
    employees: 15,
    departments: 4,
    status: "Inactive",
  },
];

export function getLocationById(id: string, locations: readonly LocationRecord[] = MOCK_LOCATIONS) {
  return locations.find((location) => location.id === id) ?? null;
}

export function getLocationScopeLabel(
  scope: string,
  locations: readonly LocationRecord[] = MOCK_LOCATIONS,
) {
  if (scope === ORGANIZATION_WIDE_SCOPE) {
    return "Organization-wide";
  }
  return getLocationById(scope, locations)?.name ?? "Unknown location";
}

export function getLocationScopeHelp(
  scope: string,
  locations: readonly LocationRecord[] = MOCK_LOCATIONS,
) {
  if (scope === ORGANIZATION_WIDE_SCOPE) {
    return "This department is responsible across the entire organization.";
  }
  const location = getLocationById(scope, locations);
  if (!location) {
    return "Select a location from the Location module.";
  }
  return `This department is scoped to ${location.name} (${location.city}).`;
}

export function toLocationSubtitle(
  location: Pick<LocationRecord, "streetAddress" | "city" | "province">,
) {
  return [location.streetAddress, location.city, location.province].filter(Boolean).join(", ");
}
