import {
  REPAIR_CATEGORIES,
  REPAIR_OWNERS,
  REPAIR_SEVERITIES,
  type RepairBurden,
  type RepairCategory,
  type RepairFinding,
  type RepairOwner,
  type RepairSeverity,
} from "./types";

function zeroSeverity(): Record<RepairSeverity, number> {
  return REPAIR_SEVERITIES.reduce(
    (acc, severity) => ({ ...acc, [severity]: 0 }),
    {} as Record<RepairSeverity, number>,
  );
}

function zeroCategory(): Record<RepairCategory, number> {
  return REPAIR_CATEGORIES.reduce(
    (acc, category) => ({ ...acc, [category]: 0 }),
    {} as Record<RepairCategory, number>,
  );
}

function zeroOwner(): Record<RepairOwner, number> {
  return REPAIR_OWNERS.reduce(
    (acc, owner) => ({ ...acc, [owner]: 0 }),
    {} as Record<RepairOwner, number>,
  );
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Aggregate measured findings into the repair-burden report structure.
 * Pure and deterministic — no ordering assumptions beyond the fixed category,
 * severity, and owner enumerations.
 */
export function computeRepairBurden(
  findings: readonly RepairFinding[],
  paragraphsTotal: number,
): RepairBurden {
  const bySeverity = zeroSeverity();
  const byCategory = zeroCategory();
  const byOwner = zeroOwner();
  const affectedParagraphs = new Set<string>();
  let total = 0;

  for (const finding of findings) {
    const count = finding.count;
    total += count;
    bySeverity[finding.severity] += count;
    byCategory[finding.category] += count;
    byOwner[finding.owner] += count;
    if (finding.paragraphId) {
      affectedParagraphs.add(finding.paragraphId);
    }
  }

  const paragraphsAffected = affectedParagraphs.size;
  const repairDensity = paragraphsTotal > 0 ? round(total / paragraphsTotal) : 0;
  const repairPercentage =
    paragraphsTotal > 0 ? round((paragraphsAffected / paragraphsTotal) * 100, 2) : 0;

  return {
    total,
    findingCount: findings.length,
    bySeverity,
    byCategory,
    byOwner,
    paragraphsAffected,
    paragraphsTotal,
    repairDensity,
    repairPercentage,
  };
}

/** Merge several burdens (used to aggregate a fixture suite). */
export function mergeRepairBurdens(burdens: readonly RepairBurden[]): RepairBurden {
  const bySeverity = zeroSeverity();
  const byCategory = zeroCategory();
  const byOwner = zeroOwner();
  let total = 0;
  let findingCount = 0;
  let paragraphsAffected = 0;
  let paragraphsTotal = 0;

  for (const burden of burdens) {
    total += burden.total;
    findingCount += burden.findingCount;
    paragraphsAffected += burden.paragraphsAffected;
    paragraphsTotal += burden.paragraphsTotal;
    for (const severity of REPAIR_SEVERITIES) {
      bySeverity[severity] += burden.bySeverity[severity];
    }
    for (const category of REPAIR_CATEGORIES) {
      byCategory[category] += burden.byCategory[category];
    }
    for (const owner of REPAIR_OWNERS) {
      byOwner[owner] += burden.byOwner[owner];
    }
  }

  const repairDensity = paragraphsTotal > 0 ? round(total / paragraphsTotal) : 0;
  const repairPercentage =
    paragraphsTotal > 0 ? round((paragraphsAffected / paragraphsTotal) * 100, 2) : 0;

  return {
    total,
    findingCount,
    bySeverity,
    byCategory,
    byOwner,
    paragraphsAffected,
    paragraphsTotal,
    repairDensity,
    repairPercentage,
  };
}
