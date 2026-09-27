/**
 * Gauge Type Helper Utilities
 * 
 * Provides utilities for detecting gauge types and creating transformation contexts
 * from certificate data and master gauge information.
 */

import { GaugeMaster, CertificateType } from '../store/useStore';

/**
 * Detect gauge type from certificate type and gauge master data
 */
// export function detectGaugeType(
//   gaugeMaster: GaugeMaster | undefined,
//   certificateTypes: CertificateType[]
// ): string {
//   if (!gaugeMaster?.certificate_type_id) {
//     return 'unknown';
//   }

//   const certType = certificateTypes.find(ct => ct.id === gaugeMaster.certificate_type_id);
//   if (!certType) {
//     return 'unknown';
//   }

//   const gaugeTypeConfig = GaugeTypeMatcher.findGaugeType(certType.name);
//   return gaugeTypeConfig?.id || 'unknown';
// }

/**
 * Get certificate type name from gauge master and certificate types
 */
export function getCertificateTypeName(
  gaugeMaster: GaugeMaster | undefined,
  certificateTypes: CertificateType[]
): string {
  if (!gaugeMaster?.certificate_type_id) {
    return '';
  }

  const certType = certificateTypes.find(ct => ct.id === gaugeMaster.certificate_type_id);
  return certType?.name || '';
}

/**
 * Get diameter type for limit gauges
 */
// export function getDiameterType(
//   gaugeMaster: GaugeMaster | undefined,
//   certificateTypes: CertificateType[]
// ): 'inner' | 'outer' | undefined {
//   const gaugeTypeConfig = GaugeTypeMatcher.findGaugeType(
//     getCertificateTypeName(gaugeMaster, certificateTypes)
//   );

//   return gaugeTypeConfig?.specialHandling?.diameterType;
// }


