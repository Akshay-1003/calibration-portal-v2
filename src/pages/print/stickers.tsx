import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StickerBrowserPrintTemplate } from '../../components/sticker/StickerBrowserPrintTemplate';
import type { StickerPreviewData } from '../../components/sticker/StickerPreviewModal';

interface StickerPrintPageState {
  stickerData: StickerPreviewData[];
  settings: {
    withIdentification: boolean;
    withBarcode: boolean;
  };
}

/**
 * Browser Print Page for Stickers
 * 
 * This page replicates the old browser print workflow:
 * - Clean print page (no UI elements)
 * - Auto-triggers window.print() on load
 * - Uses exact mm measurements for 78mm roll
 * - Closes window after print
 */
export default function StickerBrowserPrintPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<StickerPrintPageState | null>(null);
  const [hasPrinted, setHasPrinted] = useState(false);

  useEffect(() => {
    // Get sticker data from sessionStorage
    try {
      const storedData = sessionStorage.getItem('stickerPrintData');
      if (!storedData) {
        navigate('/transactions/inward', { replace: true });
        return;
      }

      const parsedData = JSON.parse(storedData) as StickerPrintPageState;
      if (!parsedData.stickerData || parsedData.stickerData.length === 0) {
        navigate('/transactions/inward', { replace: true });
        return;
      }

      setState(parsedData);

      // Auto-trigger print dialog after DOM is ready
      const timer = setTimeout(() => {
        window.print();
      }, 100);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error loading sticker print data:', error);
      navigate('/transactions/inward', { replace: true });
    }
  }, [navigate]);

  // Handle after print - close window
  useEffect(() => {
    const handleAfterPrint = () => {
      if (!hasPrinted) {
        setHasPrinted(true);
        // Close window after print dialog closes
        setTimeout(() => {
          window.close();
          // Fallback: navigate back if window.close() doesn't work
          setTimeout(() => {
            navigate('/transactions/inward', { replace: true });
          }, 500);
        }, 500);
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [hasPrinted, navigate]);

  if (!state) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'white'
      }}>
        <p style={{ color: '#666' }}>Loading sticker data...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* CRITICAL: Print-only styles - exact mm measurements for 78mm roll */
        @media print {
          @page {
            size: 78mm auto;
            margin: 0 !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 78mm !important;
            min-width: 78mm !important;
            max-width: 78mm !important;
            background: white !important;
          }

          /* Hide everything except print content */
          .no-print {
            display: none !important;
          }

          .print-content {
            display: block !important;
            width: 78mm !important;
            min-width: 78mm !important;
            max-width: 78mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }

        /* Screen styles - minimal, just for loading */
        @media screen {
          html, body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: Arial, Helvetica, sans-serif;
          }

          .print-content {
            display: block;
            width: 78mm;
            min-width: 78mm;
            max-width: 78mm;
            margin: 0 auto;
            padding: 0;
          }
        }
      `}</style>

      <div className="print-content">
        {state && state.stickerData && state.stickerData.length > 0 ? (
          <StickerBrowserPrintTemplate
            stickerData={state.stickerData}
            settings={state.settings}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            No sticker data available
          </div>
        )}
      </div>
    </>
  );
}
