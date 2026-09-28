// Pure function: ไม่พึ่ง Database / NestJS / Prisma
// Backend เป็น Source of Truth — client ห้ามกำหนด score/level เอง (ดู RisksService)

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const MIN_RISK_RATING = 1;
export const MAX_RISK_RATING = 5;

export interface RiskCalculationResult {
  score: number;
  level: RiskLevel;
}

function assertValidRating(value: number, label: 'probability' | 'impact'): void {
  if (
    !Number.isInteger(value) ||
    value < MIN_RISK_RATING ||
    value > MAX_RISK_RATING
  ) {
    throw new RangeError(
      `${label} must be an integer between ${MIN_RISK_RATING} and ${MAX_RISK_RATING} (got ${value})`,
    );
  }
}

/** Risk Score = Probability × Impact (ทั้งคู่เป็นจำนวนเต็ม 1–5) */
export function calculateRiskScore(probability: number, impact: number): number {
  assertValidRating(probability, 'probability');
  assertValidRating(impact, 'impact');
  return probability * impact;
}

/**
 * 1–4    LOW
 * 5–9    MEDIUM
 * 10–16  HIGH
 * 17–25  CRITICAL
 */
export function calculateRiskLevel(score: number): RiskLevel {
  if (!Number.isInteger(score) || score < 1 || score > 25) {
    throw new RangeError(`score must be an integer between 1 and 25 (got ${score})`);
  }
  if (score <= 4) return 'LOW';
  if (score <= 9) return 'MEDIUM';
  if (score <= 16) return 'HIGH';
  return 'CRITICAL';
}

export function calculateRisk(probability: number, impact: number): RiskCalculationResult {
  const score = calculateRiskScore(probability, impact);
  return { score, level: calculateRiskLevel(score) };
}
