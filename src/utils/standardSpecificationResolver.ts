import { fetchThreadRingPlugById } from "../services/threadRingPlugSpecifications";

type SpecificationRecord = Record<string, unknown>;

const lookupCache = new Map<string, Promise<string | null>>();

const asRecord = (value: unknown): SpecificationRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as SpecificationRecord
    : {};

export const getStandardSpecificationId = (value: unknown): string => {
  const specs = asRecord(value);
  const rawId = specs.standard_specification_id;
  if (typeof rawId === "string" || typeof rawId === "number") return String(rawId).trim();
  const idRecord = asRecord(rawId);
  return String(idRecord.$oid ?? idRecord.id ?? "").trim();
};

export const resolveStandardSpecificationText = async (id: string): Promise<string | null> => {
  const normalizedId = id.trim();
  if (!normalizedId) return null;

  let lookup = lookupCache.get(normalizedId);
  if (!lookup) {
    lookup = fetchThreadRingPlugById(normalizedId)
      .then((result) => result?.standard_specification?.trim() || null)
      .catch(() => null);
    lookupCache.set(normalizedId, lookup);
  }

  return lookup;
};

export const resolveInvoiceStandardSpecifications = async <T extends {
  specification: string;
  standard_specification_id?: string;
}>(items: T[]): Promise<T[]> => Promise.all(items.map(async (item) => {
  const id = item.standard_specification_id || getStandardSpecificationId(item.specification);
  if (!id) return item;

  const standardSpecification = await resolveStandardSpecificationText(id);
  if (!standardSpecification) return item;

  const existingSpecification = item.specification.trim();
  if (existingSpecification === "-") {
    return { ...item, specification: standardSpecification };
  }
  if (existingSpecification.toLocaleLowerCase().includes(standardSpecification.toLocaleLowerCase())) {
    return item;
  }

  return { ...item, specification: `${existingSpecification}; ${standardSpecification}` };
}));
