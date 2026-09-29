import { describe, expect, it } from "vitest";
import {
  findInvoiceRateCardEntry,
  getInvoiceRateCardRate,
} from "../utils/rateCardLookup";
import type { InvoiceTableGaugeItem } from "../components/billing/invoiceItemTableShared";

const baseGauge = (overrides: Partial<InvoiceTableGaugeItem>): InvoiceTableGaugeItem => ({
  id: "row-1",
  master_gauge_id: "gauge-1",
  master_gauge_name: "Plain Plug Gauge",
  specifications: {},
  ...overrides,
});

describe("rate card invoice lookup", () => {
  it("matches manual text ranges against rate-card measurement ranges", () => {
    const rate = getInvoiceRateCardRate(
      {
        "gauge-1": [
          { rate_type: "range", range: { min: 0, max: 150 }, rate: 180 },
        ],
      },
      baseGauge({
        master_gauge_name: "Bore Gauge",
        specification: "35-60",
        specifications: { value: "35-60" },
      }),
      "998346",
    );

    expect(rate).toBe("180");
  });

  it("uses nested input basic size from outward gauge specs", () => {
    const entry = findInvoiceRateCardEntry(
      {
        "gauge-1": [
          { rate_type: "range", range: { min: 1, max: 50 }, rate: 120 },
          { rate_type: "range", range: { min: 50, max: 100 }, rate: 140 },
        ],
      },
      baseGauge({
        specifications: {
          inputs: {
            method: "tolerance",
            inputs: {
              basic_size: 75,
              upper_tolerance: 0.2,
              lower_tolerance: -0.2,
            },
          },
          go: { basic_size: 74.8 },
          no_go: { basic_size: 75.2 },
        },
      }),
      "998346",
    );

    expect(entry?.rate).toBe(140);
  });

  it("uses upper-inclusive slab boundaries for nominal basic size", () => {
    const rate = getInvoiceRateCardRate(
      {
        "gauge-1": [
          { rate_type: "range", range: { min: 50, max: 100 }, rate: 140 },
          { rate_type: "range", range: { min: 100, max: 200 }, rate: 180 },
        ],
      },
      baseGauge({
        specifications: {
          inputs: {
            inputs: {
              basic_size: 100,
              upper_tolerance: 0.2,
              lower_tolerance: -0.2,
            },
          },
          go: { basic_size: 99.8 },
          no_go: { basic_size: 100.2 },
        },
      }),
      "998346",
    );

    expect(rate).toBe("140");
  });

  it("does not use servicing rates for calibration HSN rows", () => {
    const rateCard = {
      "gauge-1": [
        {
          rate_type: "service",
          range: { min: 0, max: 600 },
          standard_specification: "Servicing with calibration",
          rate: 1250,
        },
        {
          rate_type: "range",
          range: { min: 0, max: 600 },
          standard_specification: "Calibration",
          rate: 550,
        },
      ],
    };
    const gauge = baseGauge({
      specification: "100",
      specifications: { value: "100" },
    });

    expect(getInvoiceRateCardRate(rateCard, gauge, "998346")).toBe("550");
    expect(getInvoiceRateCardRate(rateCard, gauge, "998347")).toBe("1250");
  });
});
