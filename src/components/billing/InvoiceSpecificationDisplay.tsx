import { useThreadRingPlugByIdQuery } from "../../hooks/queries/threadRingPlugs";
import { formatSpecificationForPrint } from "../../utils/specificationPrintFormatter";
import { getStandardSpecificationId } from "../../utils/standardSpecificationResolver";

interface InvoiceSpecificationDisplayProps {
  specification: unknown;
  unit?: string;
  gaugeType?: string;
  className?: string;
}

export const InvoiceSpecificationDisplay = ({
  specification,
  unit = "mm",
  gaugeType,
  className,
}: InvoiceSpecificationDisplayProps) => {
  const id = getStandardSpecificationId(specification);
  const standardSpecificationQuery = useThreadRingPlugByIdQuery(id, {
    enabled: Boolean(id),
  });
  const standardSpecification = standardSpecificationQuery.data?.standard_specification;
  const printableSpecification = standardSpecification && specification && typeof specification === "object"
    ? { ...(specification as Record<string, unknown>), standard_specification: standardSpecification }
    : specification;

  return (
    <span className={className}>
      {formatSpecificationForPrint(printableSpecification, unit, gaugeType)}
    </span>
  );
};
