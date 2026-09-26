// Pure function: ไม่พึ่ง Database
// budgetChange = after - before
// budgetChangePercent = (after-before)/before * 100  (null ถ้า before = 0 กันหารด้วยศูนย์)

export interface BudgetChangeResult {
  change: number;
  changePercent: number | null;
}

export function calculateBudgetChange(before: number, after: number): BudgetChangeResult {
  if (before < 0) throw new RangeError(`before budget must be >= 0 (got ${before})`);
  if (after < 0) throw new RangeError(`after budget must be >= 0 (got ${after})`);

  const change = after - before;
  const changePercent = before === 0 ? null : (change / before) * 100;
  return { change, changePercent };
}
