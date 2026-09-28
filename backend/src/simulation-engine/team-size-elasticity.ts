// Pure function: ไม่พึ่ง Database
// D_new = D_old * ((1-p) + p * (T_old/T_new)),  p = Parallelization Factor
// อ้างอิงจาก PHASE 4 BUSINESS LOGIC FREEZE ข้อ 4 (MVP p = 0.5, ปัดเป็นจำนวนวันเต็ม)

export const DEFAULT_PARALLELIZATION_FACTOR = 0.5;

export function applyTeamSizeElasticity(
  duration: number,
  oldTeamSize: number,
  newTeamSize: number,
  p: number = DEFAULT_PARALLELIZATION_FACTOR,
): number {
  if (!Number.isInteger(duration) || duration < 0) {
    throw new RangeError(`duration must be a non-negative integer (got ${duration})`);
  }
  if (!Number.isInteger(oldTeamSize) || oldTeamSize < 1) {
    throw new RangeError(`oldTeamSize must be an integer >= 1 (got ${oldTeamSize})`);
  }
  if (!Number.isInteger(newTeamSize) || newTeamSize < 1) {
    throw new RangeError(`newTeamSize must be an integer >= 1 (got ${newTeamSize})`);
  }
  if (p < 0 || p > 1) {
    throw new RangeError(`p (parallelization factor) must be between 0 and 1 (got ${p})`);
  }

  const raw = duration * ((1 - p) + p * (oldTeamSize / newTeamSize));
  return Math.round(raw);
}
