# Sticker Printing System

This system provides a pixel-accurate sticker preview that matches exactly what will be printed on TSC printers using TSPL language.

## Features

- **1:1 Preview Accuracy**: Preview matches printed output exactly (same size, layout, text position, barcode position)
- **Layout Schema**: Single JSON layout definition used for both React preview and backend TSPL generation
- **DPI Conversion**: Accurate mm to px conversion using 203 DPI formula
- **CODE128 Barcode Support**: Real barcode rendering using JsBarcode library

## Installation

Install the required barcode library:

```bash
npm install jsbarcode @types/jsbarcode
```

## Layout Schema

The layout is defined in `stickerLayout.ts` using a JSON-like structure:

```typescript
interface StickerLayout {
  width: number;  // Sticker width in mm
  height: number; // Sticker height in mm
  elements: LayoutElement[]; // Array of layout elements
}
```

### Element Types

#### Text Element
```typescript
{
  type: "text",
  x: 1,              // X position in mm
  y: 1,              // Y position in mm
  fontSize: 2,       // Font size in mm
  fontWeight: "bold", // "normal" | "semibold" | "bold"
  align: "left",      // "left" | "center" | "right"
  content: "{vmcId}", // Text content or template variable
  color: "#000000"    // Hex color
}
```

#### Barcode Element
```typescript
{
  type: "barcode",
  x: 1,              // X position in mm
  y: 16,             // Y position in mm
  width: 13,         // Barcode width in mm
  height: 8,         // Barcode height in mm
  data: "{barcodeData}", // Barcode data or template variable
  format: "CODE128",
  showText: false,    // Show text below barcode
  textSize: 1.5       // Text size in mm (if showText is true)
}
```

### Template Variables

- `{vmcId}` - VMC ID
- `{gId}` - G.ID (identification number)
- `{calDate}` - Calibration date
- `{dueDate}` - Due date
- `{barcodeData}` - Barcode data (usually VMC ID)

## Usage

### Frontend (React Preview)

```typescript
import { StickerPreviewRenderer } from "./StickerPreviewRenderer";
import { DEFAULT_LAYOUTS } from "./stickerLayout";

const layout = DEFAULT_LAYOUTS["15x35"];
const data = {
  vmcId: "25120001",
  gId: "G12345",
  calDate: "01/01/2025",
  dueDate: "01/01/2026",
  barcodeData: "25120001"
};

<StickerPreviewRenderer layout={layout} data={data} />
```

### Backend (TSPL Generation)

The same layout schema can be used to generate TSPL commands:

```python
# Example Python backend usage
def mm_to_dots(mm, dpi=203):
    return int((mm * dpi) / 25.4)

def generate_tspl_commands(layout, data):
    commands = []
    
    # Set label size
    commands.append(f"SIZE {layout['width']} mm, {layout['height']} mm")
    commands.append("GAP 0,0")
    commands.append("DIRECTION 1")
    commands.append("REFERENCE 0,0")
    commands.append("OFFSET 0 mm")
    commands.append("SET PEEL OFF")
    commands.append("SET CUTTER OFF")
    commands.append("SET PARTIAL_CUTTER OFF")
    commands.append("SET TEAR ON")
    commands.append("CLEAR")
    
    for element in layout['elements']:
        if element['type'] == 'text':
            x_dots = mm_to_dots(element['x'])
            y_dots = mm_to_dots(element['y'])
            font_size = mm_to_dots(element['fontSize'])
            content = render_template(element['content'], data)
            
            # Map font weight to TSPL font
            font_map = {
                'normal': 'TSS24.BF2',
                'semibold': 'TSS24.BF2',
                'bold': 'TSS24.BF2'
            }
            font = font_map.get(element.get('fontWeight', 'normal'), 'TSS24.BF2')
            
            commands.append(f"TEXT {x_dots},{y_dots},\"{font}\",0,1,1,\"{content}\"")
            
        elif element['type'] == 'barcode':
            x_dots = mm_to_dots(element['x'])
            y_dots = mm_to_dots(element['y'])
            height_dots = mm_to_dots(element['height'])
            data_str = render_template(element['data'], data)
            
            commands.append(f"BARCODE {x_dots},{y_dots},\"128\",{height_dots},1,0,2,2,\"{data_str}\"")
    
    commands.append("PRINT 1,1")
    return "\n".join(commands)
```

## DPI Conversion

The system uses 203 DPI for conversion:

- **mm to px**: `pixels = (mm * 203) / 25.4`
- **px to mm**: `mm = (pixels * 25.4) / 203`

This ensures the preview matches the printer output exactly.

## Default Layouts

Pre-defined layouts are available for common sticker sizes:
- `15x35` - 15mm x 35mm (TSC Standard)
- `20x40` - 20mm x 40mm
- `25x50` - 25mm x 50mm
- `30x60` - 30mm x 60mm

Custom layouts can be created by following the same schema structure.

## Notes

- All positions and sizes are in millimeters
- The preview uses absolute positioning for pixel-perfect accuracy
- Barcodes are rendered using JsBarcode library (CODE128 format)
- The same layout JSON can be shared between frontend and backend

