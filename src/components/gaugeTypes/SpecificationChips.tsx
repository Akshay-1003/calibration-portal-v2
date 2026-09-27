import React from 'react';
import { Chip } from '@heroui/react';
import { extractSpecificationTypes } from '../../utils/specificationParser';
import { cn } from '../../lib/utils';

interface SpecificationChipsProps {
  specifications: unknown;
  gaugeType?: string | null;
  unit?: string; // Unit for measurements (mm, inch, cm, m) - defaults to 'mm'
  maxChips?: number;
  maxTextLength?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'flat' | 'bordered' | 'solid';
}

/**
 * Color mapping for different specification types
 */
const SPEC_TYPE_COLORS: Record<string, { color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'; classNames?: string }> = {
  tolerance_method: { color: 'primary', classNames: 'bg-blue-100 text-blue-700 border-blue-300' },
  go_no_go_direct: { color: 'success', classNames: 'bg-green-100 text-green-700 border-green-300' },
  go: { color: 'success', classNames: 'bg-green-100 text-green-700 border-green-300' },
  no_go: { color: 'danger', classNames: 'bg-red-100 text-red-700 border-red-300' },
  inputs: { color: 'primary', classNames: 'bg-blue-100 text-blue-700 border-blue-300' },
  basic_size: { color: 'secondary', classNames: 'bg-purple-100 text-purple-700 border-purple-300' },
  standard_specification: { color: 'primary', classNames: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  range: { color: 'secondary', classNames: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  least_count: { color: 'warning', classNames: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  taper_angle: { color: 'secondary', classNames: 'bg-pink-100 text-pink-700 border-pink-300' },
  thread_specs: { color: 'primary', classNames: 'bg-blue-100 text-blue-700 border-blue-300' },
  surface_plate: { color: 'secondary', classNames: 'bg-gray-100 text-gray-700 border-gray-300' },
  spline: { color: 'primary', classNames: 'bg-teal-100 text-teal-700 border-teal-300' },
  specification: { color: 'default', classNames: 'bg-gray-100 text-gray-700 border-gray-300' },
};

/**
 * SpecificationChips Component
 * 
 * Dynamically displays chips for different specification types found in a specification object.
 * Automatically analyzes the specification structure and displays appropriate chips.
 * 
 * @param specifications - The specification object to analyze
 * @param gaugeType - Optional gauge type for context
 * @param maxChips - Maximum number of chips to display (default: 5)
 * @param className - Additional CSS classes
 * @param size - Chip size (default: 'sm')
 * @param variant - Chip variant (default: 'flat')
 */
export const SpecificationChips: React.FC<SpecificationChipsProps> = ({
  specifications,
  gaugeType,
  unit = 'mm', // Default to 'mm' if not provided
  maxChips = 5,
  maxTextLength = 48,
  className,
  size = 'sm',
  variant = 'flat',
}) => {
  const specTypes = React.useMemo(() => {
    return extractSpecificationTypes(specifications, gaugeType, unit);
  }, [specifications, gaugeType, unit]);

  if (specTypes.length === 0) {
    return (
      <span className="text-xs text-gray-400 italic" title="No specifications">
        -
      </span>
    );
  }

  const chipsToShow = specTypes.slice(0, maxChips);
  const remainingCount = Math.max(0, specTypes.length - maxChips);

  const truncateText = (value: string, limit: number): string => {
    if (!value) return value;
    if (value.length <= limit) return value;
    return `${value.slice(0, limit - 1)}...`;
  };

  return (
    <div className={cn('flex flex-wrap gap-1 items-center', className)}>
      {chipsToShow.map((specType, index) => {
        const colorConfig = SPEC_TYPE_COLORS[specType.type] || SPEC_TYPE_COLORS.specification;
        
        // Display format: Show value only (no label) for tolerance_method, go_no_go_direct, range, basic_size
        // For others, show "Label: Value" if label exists
        const fullDisplayText = (specType.type === 'tolerance_method' || 
                            specType.type === 'go_no_go_direct' || 
                            specType.type === 'range' || 
                            specType.type === 'basic_size' ||
                            !specType.label)
          ? specType.value
          : specType.value 
            ? `${specType.label}: ${specType.value}`
            : specType.label;
        const displayText = truncateText(fullDisplayText, maxTextLength);
        return (
          <Chip
            key={`${specType.type}-${index}`}
            size={size}
            variant={variant}
            classNames={{
              base: cn(
                'border max-w-full',
                colorConfig.classNames || 'bg-gray-100 text-gray-700 border-gray-300'
              ),
              content: 'text-xs font-medium px-1.5 py-0.5 max-w-[190px] truncate inline-block',
            }}
            title={specType.fullValue || fullDisplayText || specType.label}
          >
            {displayText}
          </Chip>
        );
      })}
      {remainingCount > 0 && (
        <Chip
          size={size}
          variant={variant}
          classNames={{
            base: 'bg-gray-100 text-gray-600 border-gray-300',
            content: 'text-xs font-medium px-1.5 py-0.5',
          }}
          title={`${remainingCount} more specification type${remainingCount > 1 ? 's' : ''}`}
        >
          +{remainingCount}
        </Chip>
      )}
    </div>
  );
};

export default SpecificationChips;
