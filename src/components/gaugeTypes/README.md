# Gauge Types Components

This directory contains components for different gauge types and their specification tables.

## Architecture

The gauge type system uses a **router/dispatcher pattern** with the `SpecificationTable` component that renders different gauge components based on the certificate type name.

## Components

### SpecificationTable.tsx
The main router component that determines which gauge component to render based on the certificate type name using a switch case pattern.

### ODLimitGuage.tsx (LimitGuageTable)
The main limit gauge component that handles:
- OD (Outer Diameter) Limit Gauge
- ID (Inner Diameter) Limit Gauge (reuses the same component)
- Generic Limit Gauge types

### MasterPiece.tsx (MasterPieceTable)
Master Piece gauge component that handles:
- Reference standard measurements (no Go/No-Go concept)
- Nominal vs measured size comparisons
- Automatic deviation calculations in micrometers (µm)
- Dynamic row management for multiple measurements

### specificationUtils.ts
Utility functions for:
- Determining if a gauge type should show specification tables
- Categorizing gauge types
- Pattern matching for different gauge names

## Supported Gauge Types

| Gauge Type | Component Used | Status |
|------------|----------------|---------|
| OD Limit Gauge | LimitGuageTable | ✅ Implemented |
| ID Limit Gauge | LimitGuageTable | ✅ Implemented (reuses OD) |
| Generic Limit Gauge | LimitGuageTable | ✅ Implemented (fallback) |
| Master Piece | MasterPieceTable | ✅ Implemented |
| Thread Gauge | - | 🚧 Planned |

## Usage

```tsx
import { SpecificationTable } from './components/gaugeTypes/SpecificationTable';

function MyComponent() {
  return (
    <SpecificationTable
      certificateData={certificateData}
      onSpecificationChange={handleSpecificationChange}
      initialSpecifications={initialSpecs}
    />
  );
}
```

## Adding New Gauge Types

### Option 1: Reuse Existing Component
If the new gauge type uses similar logic to existing ones:

```tsx
// In SpecificationTable.tsx
case certificateTypeName.includes('new similar gauge'):
  return (
    <LimitGuageTable  // Reuse existing component
      certificateData={certificateData}
      onSpecificationChange={onSpecificationChange}
      initialSpecifications={initialSpecifications}
    />
  );
```

### Option 2: Create New Component
If the gauge type needs unique functionality:

1. **Create the component file** (e.g., `MasterPiece.tsx`)
2. **Import it** in `SpecificationTable.tsx`
3. **Add the case** in the switch statement
4. **Update utilities** in `specificationUtils.ts`

```tsx
// 1. Create MasterPiece.tsx
export const MasterPieceTable: React.FC<SpecificationTableProps> = ({ ... }) => {
  // Component implementation
};

// 2. Import in SpecificationTable.tsx
import { MasterPieceTable } from './MasterPiece';

// 3. Add case in switch statement
case certificateTypeName.includes('master piece'):
  return (
    <MasterPieceTable
      certificateData={certificateData}
      onSpecificationChange={onSpecificationChange}
      initialSpecifications={initialSpecifications}
    />
  );

// 4. Update specificationUtils.ts patterns
const gaugePatterns = [
  // ... existing patterns
  /master\s*piece/i,
  /masterpiece/i,
];
```

## Component Interface

All gauge components should implement the same interface:

```tsx
interface SpecificationTableProps {
  certificateData: CertificateData | null;
  onSpecificationChange: (specifications: SpecificationData | null) => void;
  initialSpecifications?: SpecificationData | null;
}
```

## Benefits of This Architecture

1. **Reusability**: Similar gauge types can share components
2. **Maintainability**: Single point of routing logic
3. **Extensibility**: Easy to add new gauge types
4. **Consistency**: All gauge components follow the same interface
5. **Performance**: Only loads the needed component

## Pattern Matching

The system uses flexible pattern matching to handle various naming conventions:

- `OD Limit Gauge`, `od limit gauge`, `Outer Diameter Limit`
- `ID Limit Gauge`, `id limit gauge`, `Inner Diameter Limit`
- `Master Piece`, `masterpiece`, `Reference Gauge`
- And more...

This ensures the system works with different certificate naming conventions.