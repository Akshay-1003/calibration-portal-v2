import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@heroui/react";
import SpecificationReadOnlyField, { formatSpecificationValue } from "../../specifications/SpecificationReadOnlyField";

interface SplineTypeGaugeProps {
  readOnly?: boolean;
  initialData?: Record<string, unknown>;
}

export default function SplineTypeGauge({ readOnly = false, initialData }: SplineTypeGaugeProps) {
  const { register, setValue, watch } = useFormContext();

  const specs = watch("specifications");

  useEffect(() => {
    if (readOnly) return;
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
      setValue("specifications", {
        specification: "",
        numberOfSplines: "",
        majorDiameterMin: "",
        majorDiameterMax: "",
        dimensionOverPinMin: "",
        dimensionOverPinMax: "",
        pinDiameter: "",
        diameterBetweenPin: "",
      });
    }
  }, [readOnly, specs, setValue]);

  if (readOnly) {
    const data = initialData ?? specs ?? {};
    const rows = [
      { label: "No. of Splines - Z", value: data.numberOfSplines },
      { label: "Major Diameter", value: `${formatSpecificationValue(data.majorDiameterMin)} / ${formatSpecificationValue(data.majorDiameterMax)}` },
      { label: "Dimension Over Pin - S1", value: `${formatSpecificationValue(data.dimensionOverPinMin)} / ${formatSpecificationValue(data.dimensionOverPinMax)}` },
      { label: "Pin Diameter - d1", value: data.pinDiameter },
      { label: "Diameter Between Pin", value: data.diameterBetweenPin },
    ];

    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="mb-4">
          <SpecificationReadOnlyField label="Specification" value={data.specification} />
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r border-gray-600">
                  Parameter
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                  Specification Size
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                    {row.label}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-700">
                    {formatSpecificationValue(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Title */}
      <div className="text-sm font-medium text-gray-700 mb-1">
        Specification
      </div>

      {/* Main Container */}
      <div className="w-full bg-gray-100 border rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        {/* Specification Input Field */}
        <div className="mb-4">
          <Input
            {...register("specifications.specification")}
            placeholder="Enter specification"
            size="md"
            radius="sm"
            labelPlacement="outside"
            classNames={{
              inputWrapper:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          />
        </div>

        {/* Specification Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider border-r border-gray-600">
                  PARAMETER
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                  SPECIFICATION SIZE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Row 1: No. of Splines -Z */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  No. of Splines -Z
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Input
                    {...register("specifications.numberOfSplines")}
                    placeholder="0"
                    size="sm"
                    radius="sm"
                    classNames={{
                      inputWrapper:
                        "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                    }}
                    className="w-full"
                  />
                </td>
              </tr>

              {/* Row 2: Major Diameter */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  Major Diameter
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("specifications.majorDiameterMin")}
                      placeholder="0"
                      size="sm"
                      radius="sm"
                      classNames={{
                        inputWrapper:
                          "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                      }}
                      className="flex-1"
                    />
                    <span className="text-gray-500">/</span>
                    <Input
                      {...register("specifications.majorDiameterMax")}
                      placeholder="0"
                      size="sm"
                      radius="sm"
                      classNames={{
                        inputWrapper:
                          "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                      }}
                      className="flex-1"
                    />
                  </div>
                </td>
              </tr>

              {/* Row 3: Dimension Over Pin -S1 */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  Diamention Over Pin -S1
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Input
                      {...register("specifications.dimensionOverPinMin")}
                      placeholder="0"
                      size="sm"
                      radius="sm"
                      classNames={{
                        inputWrapper:
                          "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                      }}
                      className="flex-1"
                    />
                    <span className="text-gray-500">/</span>
                    <Input
                      {...register("specifications.dimensionOverPinMax")}
                      placeholder="0"
                      size="sm"
                      radius="sm"
                      classNames={{
                        inputWrapper:
                          "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                      }}
                      className="flex-1"
                    />
                  </div>
                </td>
              </tr>

              {/* Row 4: Pin Diameter -d1 */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  Pin Diameter -d1
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Input
                    {...register("specifications.pinDiameter")}
                    placeholder="0"
                    size="sm"
                    radius="sm"
                    classNames={{
                      inputWrapper:
                        "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                    }}
                    className="w-full"
                  />
                </td>
              </tr>

              {/* Row 5: Diameter Between Pin */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                  Diameter Between Pin
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <Input
                    {...register("specifications.diameterBetweenPin")}
                    placeholder="0"
                    size="sm"
                    radius="sm"
                    classNames={{
                      inputWrapper:
                        "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                    }}
                    className="w-full"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
