export const normalizeRateCardDiscount = (value: unknown): number => {
  const discount = Number(value);
  if (!Number.isFinite(discount) || discount < 0) return 0;
  return discount;
};

export const getDiscountedRate = (rate: unknown, discount: unknown): number => {
  const listRate = Number(rate);
  if (!Number.isFinite(listRate)) return 0;
  const percentage = normalizeRateCardDiscount(discount);
  const boundedPercentage = Math.min(percentage, 100);
  return Math.round((listRate * (1 - boundedPercentage / 100) + Number.EPSILON) * 100) / 100;
};
