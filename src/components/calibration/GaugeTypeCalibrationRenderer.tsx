import React, { useMemo } from "react";
import { GoNoGoGaugeCalibration } from "./od-id-limit-gauges/GoNoGoGaugeCalibration";
import { MasterPeiceCalibration } from "./master-piece/MasterPeiceCalibration";
import { FixedRangeCalibration } from "./fixed-ranges/FixedRangeCalibration";
import PlungerDialCalibration from "./plunger-dials/DialCalibration";
import RingGaugeCalibration from "./master-ring/RingGaugeCalibration";
import {
  PlainThreadPlugRingGaugeCalibration,
  PlainThreadRingGaugeCalibration,
} from "./thread-plug-ring-gauges/ThreadRingGaugeCalibration";
import { PlainTaperPlugGaugeCalibration } from "./plain-taper-plug-gauges/PlainTaperPlugGaugeCalibration";
import { TaperThreadPlugRingGaugeCalibration } from "./taper-thread-plug-ring-gauges/TaperThreadPlugRingGaugeCalibration";
import { VernierCaliperCalibration } from "./vernier-caliper/VernierCaliperCalibration";
import { ExternalMicrometerCalibration } from "./external-micrometer/ExternalMicrometerCalibration";
import { DialTypeSnapGaugeCalibration } from "./dial-type-gauge/DialSnapGaugeType";
import { LeverDialCalibration } from "./lever-dial/LeverDialCalibration";
import { ComparatorStandCalibration } from "./comparator-stand/ComparatorStandCalibration";
import { BenchCenterCalibration } from "./bench-center/BenchCenterCalibration";
import { VBlockCalibration } from "./v-block/VBlockCalibration";
import { SplineGaugeCalibration } from "./spline-gauge/SplineGaugeCalibration";
import { SurfaceRoughnessCalibration } from "./surface-roughness/SurfaceRoughnessCalibration";
import { SurfacePlateCalibration } from "./surface-plate/SurfacePlateCalibration";
import { IDMasterCalibration } from "./id-master/IDMasterCalibration";

export interface GaugeCalibrationProps {
  certificate_type: string;
  onCancel: () => void;
  observations: unknown;
  specifications: unknown;
  isReadOnly?: boolean;
  master_readings?: number[];
  isRepeatability?: boolean;
  settingMaster?: boolean;
  uncertainty?: string | number
}
export const GaugeTypeCalibrationRenderer: React.FC<GaugeCalibrationProps> = React.memo(({
  certificate_type,
  onCancel,
  observations,
  specifications,
  isReadOnly,
  master_readings,
  isRepeatability,
  settingMaster,
  uncertainty
}) => {
  const type = useMemo(() => (certificate_type || "").toLowerCase().trim(), [certificate_type]);

  const commonProps = useMemo(() => ({
    onCancel,
    observations,
    specifications,
    gaugeType: certificate_type,
    isReadOnly,
    master_readings,
    isRepeatability,
    settingMaster,
    uncertainty
  }), [onCancel, observations, specifications, certificate_type, isReadOnly, master_readings, isRepeatability,settingMaster,uncertainty]);
  const typedProps = <T extends object>(props: object): T => props as T;

  const renderCalibrationComponent = () => {
    switch (type) {
      case "od limit gauge":
      case "id limit gauge":
        return (
          <GoNoGoGaugeCalibration
            {...typedProps<React.ComponentProps<typeof GoNoGoGaugeCalibration>>(commonProps)}
          />
        );
      case "master piece":
      case "slip / feeler gauge":
        return (
          <MasterPeiceCalibration
            {...typedProps<React.ComponentProps<typeof MasterPeiceCalibration>>(commonProps)}
          />
        );
      case "fixed range gauge":
      case "fixed range gauge (degree, min)":
      case "digital dial gauge":
      case "height gauge":
      case "electronic height gauge":
      case "plunger dial":
      case "depth caliper":
        return (
          <FixedRangeCalibration
            {...typedProps<React.ComponentProps<typeof FixedRangeCalibration>>(commonProps)}
          />
        );
      case "plunger dial std":
        return (
          <PlungerDialCalibration
            {...typedProps<React.ComponentProps<typeof PlungerDialCalibration>>(commonProps)}
            isReadOnly={isReadOnly}
          />
        );
      case "master ring":
        return (
          <RingGaugeCalibration
            {...typedProps<React.ComponentProps<typeof RingGaugeCalibration>>(commonProps)}
          />
        );
      case "thread plug gauge":
        return (
          <PlainThreadPlugRingGaugeCalibration
            {...typedProps<React.ComponentProps<typeof PlainThreadPlugRingGaugeCalibration>>(commonProps)}
          />
        );
      case "thread ring gauge":
        return (
          <PlainThreadRingGaugeCalibration
            {...typedProps<React.ComponentProps<typeof PlainThreadRingGaugeCalibration>>(commonProps)}
          />
        );
      case "plain taper plug gauge":
      case "plain taper ring gauge":
        return (
          <PlainTaperPlugGaugeCalibration
            {...typedProps<React.ComponentProps<typeof PlainTaperPlugGaugeCalibration>>(commonProps)}
          />
        );
      case "taper thread plug gauge":
      case "taper thread ring gauge":
        return (
          <TaperThreadPlugRingGaugeCalibration
            {...typedProps<React.ComponentProps<typeof TaperThreadPlugRingGaugeCalibration>>(commonProps)}
          />
        );
      case "caliper":
        return (
          <VernierCaliperCalibration
            {...typedProps<React.ComponentProps<typeof VernierCaliperCalibration>>(commonProps)}
          />
        );
      case "internal micrometer":
      case "external micrometer":
      case "coating thickness gauge":
        return (
          <ExternalMicrometerCalibration
            {...typedProps<React.ComponentProps<typeof ExternalMicrometerCalibration>>(commonProps)} isRepeatability={false}
            settingMaster={true}
          />
        );
      case "dial snap gauge":
        return (
          <DialTypeSnapGaugeCalibration
            {...typedProps<React.ComponentProps<typeof DialTypeSnapGaugeCalibration>>(commonProps)}
          />
        )
   
      case "comparator stand":
        return (
          <ComparatorStandCalibration
            {...typedProps<React.ComponentProps<typeof ComparatorStandCalibration>>(commonProps)}
          />
        );
      case "v block":
        return (
          <VBlockCalibration
            {...typedProps<React.ComponentProps<typeof VBlockCalibration>>(commonProps)}
          />
        );
      case "bench center":
        return (
          <BenchCenterCalibration
            {...typedProps<React.ComponentProps<typeof BenchCenterCalibration>>(commonProps)}
          />
        );
      case "spline gauge":
        return (
          <SplineGaugeCalibration
            {...typedProps<React.ComponentProps<typeof SplineGaugeCalibration>>(commonProps)}
          />
        );
      case "pressure gauge":
        return (
          <LeverDialCalibration
            {...typedProps<React.ComponentProps<typeof LeverDialCalibration>>(commonProps)}
          />
        );
      case "surface plate":
        return (
          <SurfacePlateCalibration
            {...typedProps<React.ComponentProps<typeof SurfacePlateCalibration>>(commonProps)}
          />
        );
      case "surface roughness master/tester":
      case "surface roughness master/tester(portable)":
        return (
          <SurfaceRoughnessCalibration
            {...typedProps<React.ComponentProps<typeof SurfaceRoughnessCalibration>>(commonProps)}
          />
        );
      case "lever dial":
        return (
          <LeverDialCalibration
            {...typedProps<React.ComponentProps<typeof LeverDialCalibration>>(commonProps)}
          />
        );
      case "id master":
      case "id master gauge":
        return (
          <IDMasterCalibration
            {...typedProps<React.ComponentProps<typeof IDMasterCalibration>>(commonProps)}
          />
        );
      default:
        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Calibration view is not configured for <span className="font-medium">{certificate_type || "this gauge type"}</span>.
          </div>
        );
    }
  };

  return <div>{renderCalibrationComponent()}</div>;
});

GaugeTypeCalibrationRenderer.displayName = "GaugeTypeCalibrationRenderer";
