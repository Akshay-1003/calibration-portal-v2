# Outward Chalan Preview & Print

This module provides a professional chalan (delivery slip) preview modal with print and PDF download functionality.

## Components

### 1. `ChalanTemplate.tsx`
The main template component that renders the chalan document. It displays:
- Company header with logo
- Recipient information
- Chalan summary (Outward No, Date, Transport, Total Qty)
- Items table with all gauge details
- Footer with receiver fields and signature

### 2. `ChalanPreviewModal.tsx`
Modal component that wraps the chalan template and provides:
- Print functionality (opens browser print dialog)
- PDF download functionality (generates and downloads PDF)
- Loading states
- Error handling

### 3. `chalanUtils.ts`
Utility functions for:
- Transforming outward data to chalan format
- API integration helpers
- Data mapping utilities

## Usage

### Basic Integration

```tsx
import { ChalanPreviewModal } from "../../../components/chalan/ChalanPreviewModal";
import { transformOutwardToChalanData } from "../../../components/chalan/chalanUtils";
import type { ChalanData } from "../../../components/chalan/ChalanTemplate";

// In your component
const [isModalOpen, setIsModalOpen] = useState(false);
const [chalanData, setChalanData] = useState<ChalanData | null>(null);

const handlePrint = () => {
  // Transform your data
  const data = transformOutwardToChalanData(outwardEntry, outwardItems);
  setChalanData(data);
  setIsModalOpen(true);
};

return (
  <>
    <ChalanPreviewModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      chalanData={chalanData}
      loading={false}
    />
    <Button onClick={handlePrint}>Print Chalan</Button>
  </>
);
```

## API Integration

### Current Implementation

The current implementation uses the existing `outwardEntry` and `outwardItems` data from the Outward detail page. The `transformOutwardToChalanData` function maps this data to the chalan format.

### Custom API Integration

If you have a dedicated API endpoint for chalan data, update the `fetchChalanData` function in `chalanUtils.ts`:

```typescript
export const fetchChalanData = async (
  outwardId: string,
  apiClient: any
): Promise<ChalanData | null> => {
  try {
    // Replace with your actual API endpoint
    const response = await apiClient.getApiResponse(`/outward/${outwardId}/chalan`);
    const data = extractApiData(response);
    
    // Transform API response to ChalanData format
    return {
      company_name: data.company_name,
      company_address: data.company_address,
      // ... map all fields
    };
  } catch (error) {
    console.error("Error fetching chalan data:", error);
    throw error;
  }
};
```

### Expected API Response Schema

The API should return data in the following format (or you can transform it):

```typescript
interface ChalanData {
  // Company Information
  company_name: string;
  company_address: string;
  company_contact: string;
  company_email: string;
  company_logo?: string;

  // Chalan Information
  chalan_number: string;
  chalan_date: string;
  outward_no: string;
  outward_date: string;
  transport_by: string;
  total_qty: number;

  // Recipient Information
  recipient_name: string;
  recipient_address: string;

  // Items
  items: Array<{
    sr_no: number;
    gauge_name: string;
    identification_number: string;
    lab_id: string;
    dc_no?: string;
    dc_date?: string;
    specification: string;
    qty: number;
  }>;

  // Footer (optional)
  receiver_name?: string;
  receiver_contact?: string;
  receiver_signatory?: string;
}
```

## Customization

### Company Information

Update the default company info in `chalanUtils.ts`:

```typescript
const DEFAULT_COMPANY_INFO = {
  company_name: "YOUR COMPANY NAME",
  company_address: "YOUR ADDRESS",
  company_contact: "YOUR CONTACT",
  company_email: "YOUR EMAIL",
  company_logo: "/path/to/logo.svg",
};
```

Or pass custom company info when transforming:

```typescript
const data = transformOutwardToChalanData(
  outwardEntry,
  outwardItems,
  {
    company_name: "Custom Name",
    company_logo: "/custom/logo.png",
  }
);
```

### Styling

The chalan template uses inline styles for print compatibility. To customize:

1. **Print Styles**: Edit `src/styles/chalan-print.css`
2. **Template Styles**: Modify `ChalanTemplate.tsx` component styles
3. **Modal Styles**: Customize `ChalanPreviewModal.tsx`

## Features

✅ **Print Functionality**
- Opens browser print dialog
- Optimized for A4 paper size
- Proper page breaks
- Print-specific styling

✅ **PDF Download**
- High-quality PDF generation
- Uses html-to-image + jsPDF
- Proper scaling and formatting
- Automatic filename generation

✅ **Responsive Design**
- Works on all screen sizes
- Scrollable modal for large content
- Mobile-friendly

✅ **Professional Layout**
- Industry-standard chalan format
- Clear typography
- Proper spacing and alignment
- Logo support

## Dependencies

- `jspdf` - PDF generation
- `html-to-image` - HTML to image conversion
- React components from `@heroui/react`
- Custom Modal component

## Notes

- The chalan template is designed to match the provided design exactly
- Print styles ensure proper formatting when printing
- PDF generation waits for all images to load before creating the PDF
- The modal is fully accessible with keyboard navigation support



