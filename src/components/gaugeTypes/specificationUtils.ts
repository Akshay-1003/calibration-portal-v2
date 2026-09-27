/**
 * Utility functions for specification table logic
 */

/**
 * Supported gauge types that have specification tables
 */
export const SUPPORTED_GAUGE_TYPES = {
  OD_LIMIT_GAUGE: 'OD Limit Gauge',
  ID_LIMIT_GAUGE: 'ID Limit Gauge',
  MASTER_PIECE: 'Master Piece',
  FIXED_RANGE_GAUGE: 'Fixed Range Gauge',
  LIMIT_GAUGE: 'limit_gauge', // Generic limit gauge
} as const;

/**
 * Check if a gauge type should show the specification table
 * @param gaugeType - The gauge type string
 * @returns boolean indicating if specification table should be shown
 */
export const shouldShowSpecificationTable = (gaugeType: string): boolean => {
  if (!gaugeType) return false;

  const lowerGaugeType = gaugeType.toLowerCase().trim();

  // Define patterns for different gauge types
  const gaugePatterns = [
    // OD Limit Gauge patterns
    /od\s*limit\s*gauge/i,
    /outer\s*diameter\s*limit/i,
    /external\s*limit/i,
    
    // ID Limit Gauge patterns
    /id\s*limit\s*gauge/i,
    /inner\s*diameter\s*limit/i,
    /internal\s*limit/i,
    
    // Master Piece patterns
    /master\s*piece/i,
    /masterpiece/i,
    /reference\s*gauge/i,
    
    // Thread Gauge patterns
    /thread\s*gauge/i,
    /screw\s*gauge/i,
    /pitch\s*gauge/i,
    
    // Generic Limit Gauge patterns
    /limit\s*gauge/i,
    /go\s*no\s*go/i,
    /go\/no\s*go/i,
  ];

  // Check if any pattern matches
  return gaugePatterns.some(pattern => pattern.test(lowerGaugeType));
};

/**
 * Get the specific gauge type category from certificate data
 * @param certificateType - Certificate data object
 * @returns string representing the specific gauge type category
 */
export const getGaugeTypeCategory = (certificateType: { name: string }): string => {
  if (!certificateType?.name) return '';

  const gaugeName = certificateType.name.toLowerCase().trim();

  // Determine specific gauge type category
  if (/od\s*limit\s*gauge|outer\s*diameter\s*limit|external\s*limit/i.test(gaugeName)) {
    return SUPPORTED_GAUGE_TYPES.OD_LIMIT_GAUGE;
  }
  
  if (/id\s*limit\s*gauge|inner\s*diameter\s*limit|internal\s*limit/i.test(gaugeName)) {
    return SUPPORTED_GAUGE_TYPES.ID_LIMIT_GAUGE;
  }
  
  if (/master\s*piece|masterpiece|reference\s*gauge/i.test(gaugeName)) {
    return SUPPORTED_GAUGE_TYPES.MASTER_PIECE;
  }
  
  if (/thread\s*gauge|screw\s*gauge|pitch\s*gauge/i.test(gaugeName)) {
    return SUPPORTED_GAUGE_TYPES.FIXED_RANGE_GAUGE;
  }
  
  if (/limit\s*gauge|go\s*no\s*go|go\/no\s*go/i.test(gaugeName)) {
    return SUPPORTED_GAUGE_TYPES.LIMIT_GAUGE;
  }

  return '';
};

/**
 * Get the gauge type from certificate data
 * @param certificateData - Certificate data object
 * @returns string representing the gauge type
 */
export const getGaugeTypeFromCertificate = (certificateData: any): string => {
  if (!certificateData) return '';

  // Try to get gauge type from certificate data name
  return certificateData.name || '';
};

/**
 * Check if the gauge supports specification calculations
 * @param gaugeType - The gauge type string
 * @returns boolean indicating if gauge supports calculations
 */
export const supportsSpecificationCalculations = (gaugeType: string): boolean => {
  return shouldShowSpecificationTable(gaugeType);
};

/**
 * Get display name for gauge type
 * @param gaugeType - The gauge type string
 * @returns formatted display name
 */
export const getGaugeTypeDisplayName = (gaugeType: string): string => {
  if (!gaugeType) return 'Unknown Gauge Type';

  const category = getGaugeTypeCategory({ name: gaugeType });
  
  switch (category) {
    case SUPPORTED_GAUGE_TYPES.OD_LIMIT_GAUGE:
      return 'OD Limit Gauge';
    case SUPPORTED_GAUGE_TYPES.ID_LIMIT_GAUGE:
      return 'ID Limit Gauge';
    case SUPPORTED_GAUGE_TYPES.MASTER_PIECE:
      return 'Master Piece';
    case SUPPORTED_GAUGE_TYPES.THREAD_GAUGE:
      return 'Thread Gauge';
    case SUPPORTED_GAUGE_TYPES.LIMIT_GAUGE:
      return 'Limit Gauge';
    default:
      return gaugeType;
  }
};

/**
 * Check if a gauge type has a specific component implementation
 * @param gaugeType - The gauge type string
 * @returns boolean indicating if component exists
 */
export const hasGaugeComponent = (gaugeType: string): boolean => {
  const category = getGaugeTypeCategory({ name: gaugeType });
  
  // Components that have implementations (some may reuse existing components)
  const implementedComponents = [
    SUPPORTED_GAUGE_TYPES.OD_LIMIT_GAUGE,  // Has dedicated component
    SUPPORTED_GAUGE_TYPES.ID_LIMIT_GAUGE,  // Uses same component as OD Limit Gauge
    SUPPORTED_GAUGE_TYPES.MASTER_PIECE,    // Has dedicated component
    SUPPORTED_GAUGE_TYPES.LIMIT_GAUGE,     // Uses OD Limit as fallback
  ];
  
  return implementedComponents.includes(category as any);
};
