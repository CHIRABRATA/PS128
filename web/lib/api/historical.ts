import "server-only";
import prisma from "@/lib/db/prisma";

/**
 * Calculates historical weekly case counts for a district from actual database records over the past 6 weeks.
 *
 * Behavior when historical data is sparse:
 * - If real cases exist in the district over the last 6 weeks, returns the exact aggregated weekly counts array: [w1, w2, w3, w4, w5, w6].
 * - If NO cases exist in the district or districtId is null, returns undefined so the payload omits the field,
 *   allowing the backend to safely apply its documented baseline default without fabricating epidemiological data.
 */
export async function getHistoricalWeeklyCases(
  districtId: string | null | undefined
): Promise<number[] | undefined> {
  if (!districtId) {
    return undefined;
  }

  const now = new Date();
  const sixWeeksAgo = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

  try {
    const cases = await prisma.case.findMany({
      where: {
        reportedAt: { gte: sixWeeksAgo },
        animal: {
          herd: {
            farm: {
              village: {
                block: {
                  districtId: districtId,
                },
              },
            },
          },
        },
      },
      select: {
        reportedAt: true,
      },
    });

    if (!cases || cases.length === 0) {
      return undefined;
    }

    // Initialize 6 weekly buckets (0 to 5, where 5 is the current week)
    const buckets = [0, 0, 0, 0, 0, 0];
    const nowTime = now.getTime();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    for (const c of cases) {
      const diffMs = nowTime - new Date(c.reportedAt).getTime();
      const weeksAgo = Math.floor(diffMs / oneWeekMs);
      if (weeksAgo >= 0 && weeksAgo < 6) {
        const bucketIndex = 5 - weeksAgo; // Bucket 5 = current week
        buckets[bucketIndex] = (buckets[bucketIndex] || 0) + 1;
      }
    }

    return buckets;
  } catch (err) {
    console.error("[Historical Case Calculation Error]:", err);
    return undefined;
  }
}
