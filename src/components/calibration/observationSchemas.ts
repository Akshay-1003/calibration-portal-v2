import type { TaperThreadReadingsApiResponse } from "../../store/taperThreadReadingsStore";
import type { SurfacePlateTolerances } from "../../types/surfacePlateReferenceStandards";

// Centralized observation schemas and defaults for calibration components.

export type TypeAObservations = {
  type_a_readings?: number[];
};

export const GO_NO_GO_TABLE_KEYS = ["go", "nogo"] as const;
export type GoNoGoTableKey = (typeof GO_NO_GO_TABLE_KEYS)[number];

export type RepeatabilityObservations = {
  repeatability?: Array<number | string>;
};

export type RepeatabilityForm = {
  observations: {
    repeatability: string[];
  };
};

export const DEFAULT_TYPE_A_OBSERVATIONS: TypeAObservations = {
  type_a_readings: [],
};

export const DEFAULT_REPEATABILITY_OBSERVATIONS: RepeatabilityObservations = {
  repeatability: [],
};

/* =========================
   OD/ID Limit Gauges
========================= */
export type LimitGaugeReadingSection = {
  values?: number[];
  average?: number;
};

export type LimitGaugeObservations = {
  obs_type?: "od_limit";
  go?: { a?: LimitGaugeReadingSection; b?: LimitGaugeReadingSection };
  no_go?: { a?: LimitGaugeReadingSection; b?: LimitGaugeReadingSection };
  remarks?: { go?: string; no_go?: string };
  tables_to_print?: GoNoGoTableKey[];
  type_a_readings?: number[];
};

export const DEFAULT_LIMIT_GAUGE_OBSERVATIONS: LimitGaugeObservations = {
  obs_type: "od_limit",
  go: { a: { values: [] }, b: { values: [] } },
  no_go: { a: { values: [] }, b: { values: [] } },
  tables_to_print: [...GO_NO_GO_TABLE_KEYS],
  type_a_readings: [],
};

/* =========================
   Fixed Range Gauge
========================= */
export type FixedRangeReadingRow = {
  measured_dimension: number;
  readings: string[];
  mean: number | "";
  observed_error: number | "";
  set_as?: boolean;
};

export type FixedRangeObservations = {
  readings: FixedRangeReadingRow[];
  repeatability?: number[];
  type_a_readings?: number[];
  squareness_of_movement_on_base?: string;
  obs_type?: "fixed_range";
};

export type FixedRangeCalibrationForm = {
  observations: FixedRangeObservations;
};

export type FixedRangeObservationsObj = {
  readings: FixedRangeReadingRow[];
  repeatability?: number[];
  type_a_readings?: number[];
  squareness_of_movement_on_base?: string;
};

export const DEFAULT_FIXED_RANGE_OBSERVATIONS: FixedRangeObservations = {
  readings: [],
  repeatability: [],
  type_a_readings: [],
  obs_type: "fixed_range",
};

/* =========================
   Bore Gauge
========================= */
export type BoreGaugeReadingRow = {
  measured_dimension: number;
  readings: string[];
  mean: number | "";
  observed_error: number | "";
  set_as?: boolean;
};

export type BoreGaugeObservations = {
  readings: BoreGaugeReadingRow[];
  repeatability?: number[];
  type_a_readings?: number[];
  obs_type?: "bore_gauge";
};

export type BoreGaugeCalibrationForm = {
  observations: BoreGaugeObservations;
};

export type BoreGaugeObservationsObj = {
  readings: BoreGaugeReadingRow[];
  repeatability?: number[];
  type_a_readings?: number[];
};

export const DEFAULT_BORE_GAUGE_OBSERVATIONS: BoreGaugeObservations = {
  readings: [],
  repeatability: [],
  type_a_readings: [],
  obs_type: "bore_gauge",
};

/* =========================
   External Micrometer
========================= */
export type ExternalMicrometerReadingRow = {
  measured_dimension: number;
  reading_1: string;
  reading_2: string;
  reading_3: string;
  mean: number;
  observed_error: number;
  set_as?: boolean;
};

export type ExternalMicrometerMasterSettingSizeRow = {
  setting_master_size: { [key: string]: string };
  actual_size: { [key: string]: string };
};

export type ExternalMicrometerObservations = {
  obs_type?: "external_micrometer";
  readings: ExternalMicrometerReadingRow[];
  tables_to_print: boolean;
  parallelism_measuring_faces?: string;
  flatness_anvils?: string;
  master_setting_readings?: Array<{
    setting_size: string;
    actual_setting_size: string;
  }>;
  repeatability: string[];
  type_a_readings: string[];
};

export type ExternalMicrometerCalibrationForm = {
  observations: ExternalMicrometerObservations;
};

export type ExternalMicrometerObservationsObj = {
  obs_type?: "external_micrometer";
  readings?: ExternalMicrometerReadingRow[];
  tables_to_print?: boolean;
  parallelism_measuring_faces?: string;
  flatness_anvils?: string;
  master_setting_readings?: Array<{
    setting_size: string;
    actual_setting_size: string;
  }>;
  repeatability?: string[] | number[];
  type_a_readings?: string[] | number[];
};

export const DEFAULT_EXTERNAL_MICROMETER_OBSERVATIONS: ExternalMicrometerObservations =
  {
    obs_type: "external_micrometer",
    readings: [],
    tables_to_print: true,
    repeatability: [],
    type_a_readings: [],
  };

/* =========================
   Dial Snap Gauge
========================= */
export type DialSnapReadingRow = {
  measured_dimension: number;
  readings: Array<string | number>;
  mean: string | number;
  observed_error: number;
  set_as: boolean;
};

export type DialSnapMasterSettingSizeRow = {
  setting_master_size: { [key: string]: string };
  actual_size: { [key: string]: string };
};

export type DialSnapObservations = {
  readings: DialSnapReadingRow[];
  tables_to_print: boolean;
  print?: boolean;
  parallelism_measuring_faces?: string;
  flatness_anvils?: string;
  setting_master_size?: string;
  actual_size?: string;
  repeatability: string[];
  type_a_readings: string[];
  master_setting_table?: {
    setting_master_size: { [key: string]: string };
    actual_size: { [key: string]: string };
    reading_columns_count: number;
  };
};

export type DialSnapCalibrationForm = {
  observations: DialSnapObservations;
};

export type DialSnapObservationsObj = {
  readings?: DialSnapReadingRow[];
  tables_to_print?: boolean;
  print?: boolean;
  parallelism_measuring_faces?: string;
  flatness_anvils?: string;
  setting_master_size?: string;
  actual_size?: string;
  repeatability?: string[] | number[];
  type_a_readings?: string[] | number[];
  master_setting_table?: {
    setting_master_size: { [key: string]: string };
    actual_size: { [key: string]: string };
    reading_columns_count: number;
  };
};

export const DEFAULT_DIAL_SNAP_OBSERVATIONS: DialSnapObservations = {
  readings: [],
  tables_to_print: true,
  repeatability: [],
  type_a_readings: [],
};

/* =========================
   Depth Caliper
========================= */
export type DepthCaliperReadingRow = {
  measured_dimension: number;
  readings: Array<number | string>;
  average: number | string;
  observed_error: number | string;
  set_as?: boolean;
};

export type DepthCaliperTableKey =
  | "outside_measurement"
  | "inside_measurement"
  | "depth_measurement";

export type DepthCaliperObservations = {
  outside_measurement: DepthCaliperReadingRow[];
  inside_measurement: DepthCaliperReadingRow[];
  depth_measurement: DepthCaliperReadingRow[];
  parallelism?: Record<string, string>;
  tables_to_print?: DepthCaliperTableKey[];
  repeatability?: number[];
  type_a_readings?: number[];
  obs_type?: "caliper";
};

export type DepthCaliperCalibrationForm = {
  observations: DepthCaliperObservations;
};

export const DEFAULT_DEPTH_CALIPER_OBSERVATIONS: DepthCaliperObservations = {
  outside_measurement: [],
  inside_measurement: [],
  depth_measurement: [],
  tables_to_print: [
    "outside_measurement",
    "inside_measurement",
    "depth_measurement",
  ],
  repeatability: [],
  type_a_readings: [],
  obs_type: "caliper",
};

export type VernierCaliperReadingRow = DepthCaliperReadingRow;
export type VernierCaliperObservations = DepthCaliperObservations;
export type VernierCaliperCalibrationForm = DepthCaliperCalibrationForm;
export const DEFAULT_VERNIER_CALIPER_OBSERVATIONS =
  DEFAULT_DEPTH_CALIPER_OBSERVATIONS;

/* =========================
   Lever Dial
========================= */
export type LeverDialReadingRow = {
  turn: string;
  range: string;
  value: string;
  upward_direction: {
    stylus_up_actual_reading: string;
    stylus_up_observed_error: string;
    stylus_down_actual_reading: string;
    stylus_down_observed_error: string;
  };
  downward_direction: {
    stylus_up_actual_reading: string;
    stylus_up_observed_error: string;
    stylus_down_actual_reading: string;
    stylus_down_observed_error: string;
  };
};

export type LeverDialObservations = {
  readings: LeverDialReadingRow[];
  tables_to_print: string[];
  repeatability: string[];
  type_a_readings: string[];
};

export type LeverDialCalibrationForm = {
  observations: LeverDialObservations;
};

export type LeverDialObservationsObj = {
  readings?: LeverDialReadingRow[];
  tables_to_print?: string[];
  repeatability?: string[] | number[];
  type_a_readings?: string[] | number[];
};

export const DEFAULT_LEVER_DIAL_OBSERVATIONS: LeverDialObservations = {
  readings: [],
  tables_to_print: [],
  repeatability: [],
  type_a_readings: [],
};

/* =========================
   Plunger Dial (Types)
========================= */
export type PlungerDialDirection = "upward" | "downward";

export type PlungerDialRow = {
  turn: number;
  range: number;
  value: number;
  upward_actual?: number | null;
  upward_error?: number | null;
  downward_actual?: number | null;
  downward_error?: number | null;
};

export type PlungerDialPrintOption =
  | "upward_direction"
  | "downward_direction"
  | "upward_result"
  | "downward_result";

export type PlungerDialPrintOptions = PlungerDialPrintOption[];

export type PlungerDialObservations = {
  obs_type?: "dial";
  rows: PlungerDialRow[];
  type_a_readings?: number[];
  repeatability?: number[];
  tables_to_print?: PlungerDialPrintOptions;
};

export type PlungerDialForm = {
  observations: {
    plunger_dial: PlungerDialObservations;
    type_a_readings?: number[];
    repeatability?: number[];
  };
  attachments?: File[];
};

export type DialPayloadAttachment = {
  name: string;
  type: string;
  size: number;
  data: string;
};

export type DialPayloadRow = {
  turn: number;
  range: number;
  value: number;
  upward_actual?: number | null;
  upward_error?: number | null;
  downward_actual?: number | null;
  downward_error?: number | null;
};

export type DialPayload = {
  observations: {
    plunger_dial: {
      rows: DialPayloadRow[];
      type_a_readings?: number[];
      repeatability?: number[];
      tables_to_print?: PlungerDialPrintOptions;
      obs_type: "dial";
    };
  };
  attachments?: DialPayloadAttachment[];
};

export const DEFAULT_PLUNGER_DIAL_OBSERVATIONS: PlungerDialObservations = {
  obs_type: "dial",
  rows: [],
  type_a_readings: [],
  repeatability: [],
};

/* =========================
   Dial Calibration (Plunger Dial Form Shape)
========================= */
export type DialCalibrationReadingForm = {
  turn: string;
  range: string;
  value: string;
  upward_reading: {
    actual_reading: string;
    observed_error: string;
  };
  downward_reading: {
    actual_reading: string;
    observed_error: string;
  };
};

export type DialCalibrationFormShape = {
  observations: {
    readings: DialCalibrationReadingForm[];
    tables_to_print?: PlungerDialPrintOptions;
  };
};

/* =========================
   Master Piece
========================= */
export type MasterPieceRow = {
  basic_size?: string | number;
  readings?: Array<string | number>;
  mean?: string | number;
  observed_error?: string | number;
};

export type MasterPieceObservations = {
  obs_type?: "od_master";
  readings?: MasterPieceRow[];
  type_a_readings?: number[];
};

export type MasterPieceForm = {
  observations: {
    readings?: MasterPieceRow[];
    type_a_readings?: number[];
  };
};

export const DEFAULT_MASTER_PIECE_OBSERVATIONS: MasterPieceObservations = {
  obs_type: "od_master",
  readings: [],
  type_a_readings: [],
};

/* =========================
   ID Master
========================= */
export type IDMasterRow = {
  basic_size?: string | number;
  readings?: Array<string | number>;
  actual_readings?: Array<string | number>;
  reading_1?: string | number;
  reading_2?: string | number;
  reading_3?: string | number;
  mean?: string | number;
  parameter?: string;
  observation_label?: string;
};

export type IDMasterObservations = {
  obs_type?: "od_master";
  readings?: IDMasterRow[];
  type_a_readings?: number[];
  observation_a?: Partial<IDMasterRow> & {
    values?: Array<string | number>;
    average?: string | number;
  };
  observation_b?: Partial<IDMasterRow> & {
    values?: Array<string | number>;
    average?: string | number;
  };
};

export type IDMasterForm = {
  observations: {
    readings?: IDMasterRow[];
    type_a_readings?: number[];
  };
};

export const DEFAULT_ID_MASTER_OBSERVATIONS: IDMasterObservations = {
  obs_type: "od_master",
  readings: [],
  type_a_readings: [],
};

/* =========================
   Bench Center
========================= */
export type BenchCenterParameter = {
  parameter: string;
  readings: Array<string | number>;
  mean?: string | number;
};

export type BenchCenterObservations = {
  obs_type?: "bench_center";
  parameters?: BenchCenterParameter[];
  type_a_readings?: number[];
};

export const DEFAULT_BENCH_CENTER_OBSERVATIONS: BenchCenterObservations = {
  obs_type: "bench_center",
  parameters: [],
  type_a_readings: [],
};

/* =========================
   Comparator Stand
========================= */
export type ComparatorStandParameter = {
  parameter: string;
  readings: Array<string | number>;
  mean?: string | number;
};

export type ComparatorStandObservations = {
  obs_type?: "comparator_stand";
  parameters?: ComparatorStandParameter[];
  type_a_readings?: number[];
  repeatability?: number[];
};

export const DEFAULT_COMPARATOR_STAND_OBSERVATIONS: ComparatorStandObservations =
  {
    obs_type: "comparator_stand",
    parameters: [],
    type_a_readings: [],
    repeatability: [],
  };

/* =========================
   V-Block
========================= */
export type VBlockReadingRow = {
  parameter: string;
  reading_1?: string | number;
  reading_2?: string | number;
  reading_3?: string | number;
  observed_mean?: string | number;
};

export type VBlockObservations = {
  obs_type?: "v_block";
  v_block_readings?: VBlockReadingRow[];
  angle_plate_readings?: VBlockReadingRow[];
  type_a_readings?: number[];
};

export const DEFAULT_VBLOCK_OBSERVATIONS: VBlockObservations = {
  obs_type: "v_block",
  v_block_readings: [],
  angle_plate_readings: [],
  type_a_readings: [],
};

/* =========================
   Spline Gauge
========================= */
export type SplineReadingRow = {
  key: string;
  parameter: string;
  reading_1?: string | number;
  reading_2?: string | number;
  reading_3?: string | number;
  observed_mean?: string | number;
};

export type SplineGaugeObservations = {
  spline_rows?: SplineReadingRow[];
  type_a_readings?: number[];
};

export const DEFAULT_SPLINE_GAUGE_OBSERVATIONS: SplineGaugeObservations = {
  spline_rows: [],
  type_a_readings: [],
};

/* =========================
   Surface Roughness
========================= */
export type SurfaceRoughnessRow = {
  c1?: string | number;
  c2?: string | number;
  c3?: string | number;
  c4?: string | number;
};

export type SurfaceRoughnessObservations = {
  ra_values?: Array<string | number>;
  tables_to_print?: boolean[];
  rows?: SurfaceRoughnessRow[];
  type_a_readings?: number[];
};

export const DEFAULT_SURFACE_ROUGHNESS_OBSERVATIONS: SurfaceRoughnessObservations =
  {
    ra_values: [],
    tables_to_print: [],
    rows: [],
    type_a_readings: [],
  };

/* =========================
   Surface Plate
========================= */
export type SurfacePlateObservations = {
  obs_type?: "surface_plate";
  surface_plate_ref_id?: string;
  method?: string;
  lc?: string | number;
  grid?: {
    x_points: number;
    y_points: number;
    x_positions: number[];
    y_positions: number[];
  };
  readings?: Array<
    | {
        row_index: number;
        col_index: number;
        x: number;
        y: number;
        value: string | number;
      }
    | Array<string | number>
  >;
  calculated_flatness?: string | number;
  reference_standard?: {
    id?: string;
    size?: string;
    shape?: string;
    length?: number;
    width?: number;
    unit?: string;
    tolerances?: SurfacePlateTolerances;
  };
  type_a_readings?: number[];
};

export const DEFAULT_SURFACE_PLATE_OBSERVATIONS: SurfacePlateObservations = {
  obs_type: "surface_plate",
  surface_plate_ref_id: "",
  grid: {
    x_points: 0,
    y_points: 0,
    x_positions: [],
    y_positions: [],
  },
  readings: [],
  type_a_readings: [],
};

/* =========================
   Thread Plug/Ring Gauge
========================= */
export type ThreadPlugRingObservations = {
  obs_type?: "plain_thread_ring_gauge";
  standard_specification?: string;
  tables_to_print?: GoNoGoTableKey[];
  parameters?: {
    wire_dia?: number;
    constant?: number;
    pitch?: number;
    pitch_calculator?: number;
  };
  go?: {
    a?: { values?: number[]; mean?: number; average?: number };
    b?: { values?: number[]; mean?: number; average?: number };
    // Legacy fields (kept for backward compatibility)
    observed_size_a?: number | string;
    observed_size_b?: number | string;
    observed_size?: number | string;
    remark?: string;
  };
  no_go?: {
    a?: { values?: number[]; mean?: number; average?: number };
    b?: { values?: number[]; mean?: number; average?: number };
    // Legacy fields (kept for backward compatibility)
    observed_size_a?: number | string;
    observed_size_b?: number | string;
    observed_size?: number | string;
    remark?: string;
  };
  specification_table?: {
    go?: {
      specification_limit_max?: number | string;
      specification_limit_min?: number | string;
      wear_limit?: number | string;
      observed_size_a?: number | string;
      observed_size_b?: number | string;
      remark?: string;
    };
    no_go?: {
      specification_limit_max?: number | string;
      specification_limit_min?: number | string;
      wear_limit?: number | string;
      observed_size_a?: number | string;
      observed_size_b?: number | string;
      remark?: string;
    };
  };
  standard_specification_id?: string;
  type_a_readings?: number[];
};

export const DEFAULT_THREAD_PLUG_RING_OBSERVATIONS: ThreadPlugRingObservations =
  {
    obs_type: "plain_thread_ring_gauge",
    tables_to_print: [...GO_NO_GO_TABLE_KEYS],
    parameters: {},
    specification_table: {
      go: {},
      no_go: {},
    },
    type_a_readings: [],
  };

/* =========================
   Taper Thread Plug/Ring Gauge
========================= */
export type TaperThreadSpecifiedLimit = {
  min?: number | string | null;
  max?: number | string | null;
};

export type TaperThreadObservationRow = {
  parameter: string;
  specifiedLimit?: TaperThreadSpecifiedLimit;
  readings?: Array<number | string>;
  actual_size?: number | string;
  actualSize?: number | string;
};

export type TaperThreadObservations = {
  obs_type?: "taper_thread_gauge";
  standard_specification_id?: string;
  standard_specification?:
    | TaperThreadReadingsApiResponse
    | Record<string, unknown>;
  parameters?: TaperThreadObservationRow[];
  repeatability?: { readings?: Array<number | string> };
  type_a_readings?: number[];
};

export const DEFAULT_TAPER_THREAD_OBSERVATIONS: TaperThreadObservations = {
  obs_type: "taper_thread_gauge",
  parameters: [],
  type_a_readings: [],
};

/* =========================
   Plain Taper Plug Gauge
========================= */
export type PlainTaperPlugGaugeObservations = {
  tables_to_print?: GoNoGoTableKey[];
  go?: { observed_size?: number; remark?: string };
  no_go?: { observed_size?: number; remark?: string };
  type_a_readings?: number[];
};

export const DEFAULT_PLAIN_TAPER_PLUG_GAUGE_OBSERVATIONS: PlainTaperPlugGaugeObservations =
  {
    tables_to_print: [...GO_NO_GO_TABLE_KEYS],
    go: {},
    no_go: {},
    type_a_readings: [],
  };

/* =========================
   Ring Gauge
========================= */
export type RingGaugeParameterRow = {
  parameter: "A" | "B";
  x?: { readings?: number[] };
  y?: { readings?: number[] };
};

export type RingGaugeForm = {
  observations: {
    obs_type?: "master_ring";
    basic_size?: number;
    observed_size?: number;
    parameters: RingGaugeParameterRow[];
    type_a_readings?: number[];
  };
};

export const DEFAULT_RING_GAUGE_OBSERVATIONS: RingGaugeForm["observations"] = {
  obs_type: "master_ring",
  parameters: [],
  type_a_readings: [],
};
