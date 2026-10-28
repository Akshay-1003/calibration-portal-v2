import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchById = vi.fn();
vi.mock("../services/threadRingPlugSpecifications", () => ({
  fetchThreadRingPlugById: (...args: unknown[]) => fetchById(...args),
}));

import {
  getStandardSpecificationId,
  resolveInvoiceStandardSpecifications,
} from "../utils/standardSpecificationResolver";

describe("invoice standard specification resolution", () => {
  beforeEach(() => {
    fetchById.mockReset();
  });

  it("extracts string and serialized ObjectId values", () => {
    expect(getStandardSpecificationId({ standard_specification_id: "spec-1" })).toBe("spec-1");
    expect(getStandardSpecificationId({ standard_specification_id: { $oid: "spec-2" } })).toBe("spec-2");
    expect(getStandardSpecificationId({ standard_specification_id: null })).toBe("");
  });

  it("replaces an unresolved invoice spec with its readable master text", async () => {
    fetchById.mockResolvedValue({ standard_specification: "M12 x 1.75 - 6H" });

    const [item] = await resolveInvoiceStandardSpecifications([{
      gauge_name: "Plain Thread Plug Gauge",
      specification: "-",
      standard_specification_id: "thread-spec-1",
    }]);

    expect(item.specification).toBe("M12 x 1.75 - 6H");
    expect(fetchById).toHaveBeenCalledTimes(1);
  });

  it("preserves other measurements while adding the standard text", async () => {
    fetchById.mockResolvedValue({ standard_specification: "M12 x 1.75 - 6H" });
    const items = await resolveInvoiceStandardSpecifications([
      { specification: "PD: 10 mm", standard_specification_id: "thread-spec-3" },
      { specification: "-" },
    ]);

    expect(items.map((item) => item.specification)).toEqual(["PD: 10 mm; M12 x 1.75 - 6H", "-"]);
    expect(fetchById).toHaveBeenCalledTimes(1);
  });
});
