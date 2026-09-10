export interface HeatmapPointData {
  lat: number;
  lng: number;
  weight: number;
  caseCount: number;
  riskLevel?: string | null;
  locationName?: string;
}

export interface FarmMapMarker {
  id: string;
  name: string;
  villageName: string;
  blockName: string;
  farmerName: string;
  lat: number;
  lng: number;
  animalCount: number;
  activeCaseCount: number;
}

export interface CaseMapMarker {
  id: string;
  caseNumber: string;
  status: string;
  riskLevel: string;
  species: string;
  animalTag: string;
  farmName: string;
  villageName: string;
  blockName: string;
  farmerName: string;
  reportedAt: string;
  diagnosis?: string | null;
  lat: number;
  lng: number;
}

export interface VetMapMarker {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  activeCasesCount: number;
  pendingReviewsCount: number;
  lat: number;
  lng: number;
}

export interface FieldAgentMapMarker {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  openRequestsCount: number;
  completedVisitsCount: number;
  lat: number;
  lng: number;
}

export interface FieldVisitMapMarker {
  id: string;
  visitDate: string;
  agentName: string;
  farmName: string;
  villageName: string;
  status: string;
  observations?: string | null;
  lat: number;
  lng: number;
}

export interface AlertMapMarker {
  id: string;
  diseaseName: string;
  caseCount: number;
  villageName: string;
  blockName: string;
  windowStart: string;
  windowEnd: string;
  active: boolean;
  lat: number;
  lng: number;
}

export interface MapMarkerData {
  id: string;
  name: string;
  blockName: string;
  lat: number;
  lng: number;
  activeAlert: boolean;
  diseaseName?: string | null;
  caseCount: number;
  highRiskCount: number;
  confirmedCount: number;
  speciesBreakdown?: {
    cow: number;
    buffalo: number;
    goat: number;
    other: number;
  };
  lastReportedDate?: string | null;
}

// Strict coordinate validator to filter out invalid or malformed data
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

// Detect internal test fixtures or database IDs
export function isInternalIdentifier(str?: string | null): boolean {
  if (!str) return true;
  const s = str.trim();
  return (
    s.startsWith("Vil P") ||
    s.startsWith("Block P") ||
    s.startsWith("District P") ||
    s.includes("test_") ||
    s.includes("Test") ||
    s.includes("17888") ||
    /\d{6,}/.test(s) ||
    /^[0-9a-fA-F-]{32,}$/.test(s) ||
    /^[a-z0-9_]{20,}$/i.test(s)
  );
}

// Clean up raw block / taluka identifiers into human-readable names without fake defaults
export function formatBlockName(rawBlockName?: string | null): string {
  if (!rawBlockName) {
    return "Block Jurisdiction";
  }
  return rawBlockName.trim();
}

// Clean up raw village names into human-readable village names without fake defaults
export function formatVillageName(rawVillageName?: string | null, rawBlockName?: string | null): string {
  if (!rawVillageName) return "Village location unavailable";
  if (!isInternalIdentifier(rawVillageName)) {
    return rawVillageName.trim();
  }
  const cleanBlock = formatBlockName(rawBlockName);
  if (cleanBlock && cleanBlock !== "Block Jurisdiction") {
    return `${cleanBlock} Cluster`;
  }
  return rawVillageName.trim();
}
