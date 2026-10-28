import { describe, expect, it } from "vitest";
import {
  findInvoiceRateCardEntry,
  getInvoiceRateCardPricing,
  getInvoiceRateCardRate,
  isUnchangedLegacyRateCardListPrice,
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
  it('uses the assigned PO price-list row and never substitutes a different row', () => {
    const rates = { 'gauge-1': [
      { price_list_item_id: 'other-po', range: { min: 0, max: 100 }, rate: 100 },
      { price_list_item_id: 'assigned-po', range: { min: 0, max: 100 }, rate: 200, discount: 5 },
    ] };
    const gauge = baseGauge({ price_list_item_id: 'assigned-po', specifications: { basic_size: 68.0175 } });
    expect(getInvoiceRateCardRate(rates, gauge, '998346')).toBe('190');
    expect(getInvoiceRateCardRate(rates, { ...gauge, price_list_item_id: 'missing-row' }, '998346')).toBe('');
    expect(getInvoiceRateCardRate(rates, gauge, '__return_as_is__')).toBe('');
    expect(getInvoiceRateCardRate(rates, gauge, '998347')).toBe('');
  });

  it('resolves a thread specification ID without matching an unrelated designation', () => {
    const rates = { 'gauge-1': [{ standard_specification: 'M26 x 1.5 - 6H', range: { min: 0, max: 0 }, rate: 350 }] };
    const gauge = baseGauge({ specifications: { standard_specification_id: 'thread-1' } });
    expect(getInvoiceRateCardPricing(rates, gauge, '998346')).toBeNull();
    expect(getInvoiceRateCardPricing(rates, gauge, '998346', { 'thread-1': 'M26X1.5-6H' })?.netRate).toBe(350);
    expect(getInvoiceRateCardPricing(rates, gauge, '998346', { 'thread-1': 'M12X1.5-6H' })).toBeNull();
  });

  it("uses a populated range instead of the legacy basic_size zero default", () => {
    expect(getInvoiceRateCardRate({
      'gauge-1': [{ rate_type: 'discounted', range: { min: 50, max: 100 }, basic_size: 0, rate: 200, discount: 5 }],
    }, baseGauge({ specifications: { basic_size: 68.0175 } }), '998346')).toBe('190');
  });

  it.each([
    { basic_size: [6.353, 12.7] },
    { basic_size: [{ basic_size: 6.353 }, { basic_size: 12.7 }] },
    { go: 6.353, no_go: 12.7 },
    { go: { basic_size: 6.353 }, no_go: { basic_size: 12.7 } },
    { range: 12.7 },
  ])('matches structured imported dimensions: %j', (specifications) => {
    expect(getInvoiceRateCardRate({
      'gauge-1': [{ range: { min: 0, max: 25 }, rate: 120 }],
    }, baseGauge({ specifications }), '998346')).toBe('120');
  });

  it('requires a slab containing every imported size, not just the first displayed size', () => {
    expect(getInvoiceRateCardRate({
      'gauge-1': [
        { range: { min: 0, max: 10 }, rate: 120 },
        { range: { min: 0, max: 25 }, rate: 180 },
      ],
    }, baseGauge({ specifications: { basic_size: [6.353, 12.7] }, specification: '6.353, 12.7 mm' }), '998346')).toBe('180');
  });

  it('matches a thread designation without interpreting its pitch and class as a range', () => {
    expect(getInvoiceRateCardRate({
      'gauge-1': [
        { standard_specification: 'M26 x 1.5 - 6H', range: { min: 0, max: 0 }, rate: 350 },
      ],
    }, baseGauge({ specifications: 'M26X1.5-6H' }), '998346')).toBe('350');
  });

  it('does not assign a different thread or another master gauge rate', () => {
    const rates = { 'gauge-1': [{ rate_type: 'flat', standard_specification: 'M26X1.5-6H', rate: 350 }] };
    expect(getInvoiceRateCardRate(rates, baseGauge({ specifications: 'M12X1.5-6H' }), '998346')).toBe('');
    expect(getInvoiceRateCardRate(rates, baseGauge({ master_gauge_id: 'another-gauge', specifications: 'M26X1.5-6H' }), '998346')).toBe('');
  });

  it("applies a per-entry discount and retains its price breakdown", () => {
    const pricing = getInvoiceRateCardPricing(
      { "gauge-1": [{ rate_type: "range", range: { min: 0, max: 100 }, rate: 7500, discount: 5 }] },
      baseGauge({ specification: "50", specifications: { value: "50" } }),
      "998346",
    );

    expect(pricing).toEqual({
      listRate: 7500,
      discountPercentage: 5,
      discountAmount: 375,
      netRate: 7125,
    });
    expect(getInvoiceRateCardRate(
      { "gauge-1": [{ rate_type: "range", range: { min: 0, max: 100 }, rate: 7500, discount: 5 }] },
      baseGauge({ specification: "50", specifications: { value: "50" } }),
      "998346",
    )).toBe("7125");
  });

  it("prices a 25 mm plain plug gauge from its 0-50 slab and applies that slab discount", () => {
    const pricing = getInvoiceRateCardPricing(
      {
        "gauge-1": [
          { rate_type: "range", range: { min: 0, max: 50 }, rate: 120, discount: 5 },
          { rate_type: "range", range: { min: 50, max: 100 }, rate: 140, discount: 5 },
        ],
      },
      baseGauge({ specification: "25.00 mm", specifications: { value: "25.00 mm" } }),
      "998346",
    );

    expect(pricing).toEqual({
      listRate: 120,
      discountPercentage: 5,
      discountAmount: 6,
      netRate: 114,
    });
  });

  it("reconciles only an unchanged legacy list price, not a manual price", () => {
    expect(isUnchangedLegacyRateCardListPrice(120, 120, 120)).toBe(true);
    expect(isUnchangedLegacyRateCardListPrice(121, 120, 120)).toBe(false);
    expect(isUnchangedLegacyRateCardListPrice(114, 120, 120)).toBe(false);
  });

  it("allows a full discount to produce a zero net rate", () => {
    const pricing = getInvoiceRateCardPricing(
      { "gauge-1": [{ rate_type: "range", range: { min: 0, max: 100 }, rate: 100, discount: 100 }] },
      baseGauge({ specification: "50", specifications: { value: "50" } }),
      "998346",
    );

    expect(pricing?.netRate).toBe(0);
  });

  it("preserves a plain fractional discount as percentage points", () => {
    const pricing = getInvoiceRateCardPricing(
      { "gauge-1": [{ rate_type: "range", range: { min: 0, max: 100 }, rate: 7500, discount: 0.05 }] },
      baseGauge({ specification: "50", specifications: { value: "50" } }),
      "998346",
    );

    expect(pricing?.discountPercentage).toBe(0.05);
    expect(pricing?.netRate).toBe(7496.25);
  });

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
