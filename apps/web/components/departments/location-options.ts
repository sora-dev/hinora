/**
 * Location-scope helpers for Departments.
 * Location records live in the Location module mock data until a `/locations` API exists.
 */
import {
  getLocationById,
  getLocationScopeHelp,
  getLocationScopeLabel,
  MOCK_LOCATIONS,
  ORGANIZATION_WIDE_SCOPE,
  type LocationRecord,
  type LocationStatus,
} from "../locations/location-data";

export type LocationOption = {
  id: string;
  name: string;
  code: string;
  city: string;
  status: LocationStatus;
};

export {
  ORGANIZATION_WIDE_SCOPE,
  getLocationScopeLabel,
  getLocationScopeHelp,
  getLocationById,
};

export const LOCATION_OPTIONS: readonly LocationOption[] = MOCK_LOCATIONS.map(
  (location: LocationRecord) => ({
    id: location.id,
    name: location.name,
    code: location.code,
    city: location.city,
    status: location.status,
  }),
);
