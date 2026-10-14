export type StructuredSpecifications = Record<string, unknown>;

/** Imported legacy records may contain a display string where the API expects an object. */
export const getLegacySpecificationText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** Never send a legacy primitive back as structured specification data. */
export const normalizeGaugeSpecifications = (value: unknown): StructuredSpecifications => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as StructuredSpecifications;
};
