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

// Clean up raw block / taluka identifiers into human-readable names
export function formatBlockName(rawBlockName?: string | null): string {
  if (!rawBlockName || isInternalIdentifier(rawBlockName)) {
    return "Haveli";
  }
  return rawBlockName.trim();
}

// Clean up raw test identifiers into professional human-readable village names
export function formatVillageName(rawVillageName?: string | null, rawBlockName?: string | null): string {
  if (!rawVillageName) return "Village location unavailable";

  if (!isInternalIdentifier(rawVillageName)) {
    return rawVillageName.trim();
  }

  const cleanBlock = formatBlockName(rawBlockName);
  if (cleanBlock && !isInternalIdentifier(cleanBlock)) {
    return `${cleanBlock} Rural Cluster`;
  }

  return "Pune Rural Sector";
}
