import { Chip, Modal } from "@heroui/react";
import type { SurfacePlateReferenceStandardRecord } from "../../types/surfacePlateReferenceStandards";

interface SurfacePlateReferenceStandardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: SurfacePlateReferenceStandardRecord | null;
  isLoading?: boolean;
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm text-gray-800">{value || "N/A"}</p>
  </div>
);

const formatDateTime = (value: string) => {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export function SurfacePlateReferenceStandardDetailModal({
  isOpen,
  onClose,
  record,
  isLoading = false,
}: SurfacePlateReferenceStandardDetailModalProps) {
  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Surface Plate Reference Standard</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  Loading details...
                </div>
              ) : !record ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                  No record data available
                </div>
              ) : (
                <div className="space-y-6">
                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-4">
                      Basic Info
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailItem label="Master Gauge" value={record.master_gauge_name ?? "N/A"} />
                      <DetailItem label="Size" value={record.size} />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shape</p>
                        <Chip size="sm" variant="soft" color="accent" className="capitalize">
                          {record.shape}
                        </Chip>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-4">
                      Dimensions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <DetailItem label="Length (mm)" value={String(record.length)} />
                      <DetailItem label="Width (mm)" value={String(record.width)} />
                      <DetailItem label="Unit" value={record.unit} />
                      <DetailItem label="Standard" value={record.standard} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-4">
                      Tolerances
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <DetailItem label="Grade 0" value={String(record.tolerances.grade_0)} />
                      <DetailItem label="Grade 1" value={String(record.tolerances.grade_1)} />
                      <DetailItem label="Grade 2" value={String(record.tolerances.grade_2)} />
                      <DetailItem label="Grade 3" value={String(record.tolerances.grade_3)} />
                    </div>
                  </section>

                  <section className="rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-4">
                      Metadata
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailItem label="Updated At" value={formatDateTime(record.updated_at)} />
                      <DetailItem label="Created At" value={formatDateTime(record.created_at)} />
                      <DetailItem label="Gauge Type" value={record.gauge_type} />
                      <DetailItem label="Master Type" value={record.master_type} />
                    </div>
                  </section>
                </div>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
