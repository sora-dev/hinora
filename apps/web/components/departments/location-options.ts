/**
 * Location-scope helpers for Departments.
 * Location records are loaded from `/locations` (or `/locations/options`).
 */
import {
  getLocationById,
  getLocationScopeHelp,
  getLocationScopeLabel,
  ORGANIZATION_WIDE_SCOPE,
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
