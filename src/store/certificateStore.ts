import { create } from 'zustand';
import { toast } from 'sonner';
import { apiClient } from "../services/api";
import { InFlightManager } from '../utils/storeCache';
import { performanceUtils } from './baseStore';

export interface CertificateData {
  certificate_url: string;
  inwardId: string;
  gaugeId: string;
  timestamp: number;
}

interface CertificatePreviewPayload {
  certificateUrl?: string | null;
  isLoading?: boolean;
  loadingText?: string;
  fileName?: string;
}

const appendQueryParam = (url: string, key: string, value: string): string => {
  const [base, hash] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';
  const next = `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  return hash ? `${next}#${hash}` : next;
};

const withFreshCertificateUrl = (url: string): string =>
  appendQueryParam(url, '_ts', Date.now().toString());

interface CertificateState {
  // Loading states per certificate
  loadingCertificates: Record<string, boolean>;

  // Error states per certificate
  errors: Record<string, string | null>;

  _inFlight: InFlightManager;

  previewModal: {
    isOpen: boolean;
    certificateUrl: string | null;
    isLoading: boolean;
    loadingText: string;
    fileName: string;
  };

  // Actions
  getCertificate: (certificate_id: string) => Promise<CertificatePreviewPayload | null>;
  openPreviewModal: (payload?: CertificatePreviewPayload) => void;
  updatePreviewModal: (payload: CertificatePreviewPayload) => void;
  closePreviewModal: () => void;
}

const certificateInFlight = new InFlightManager();

export const useCertificateStore = create<CertificateState>((set) => ({
  loadingCertificates: {},
  errors: {},
  _inFlight: certificateInFlight,
  previewModal: {
    isOpen: false,
    certificateUrl: null,
    isLoading: false,
    loadingText: 'Loading certificate...',
    fileName: 'certificate',
  },

  openPreviewModal: (payload) =>
    set((s) => ({
      previewModal: {
        ...s.previewModal,
        isOpen: true,
        certificateUrl: payload?.certificateUrl ?? null,
        isLoading: payload?.isLoading ?? false,
        loadingText: payload?.loadingText ?? 'Loading certificate...',
        fileName: payload?.fileName ?? 'certificate',
      },
    })),

  updatePreviewModal: (payload) =>
    set((s) => ({
      previewModal: {
        ...s.previewModal,
        ...(payload.certificateUrl !== undefined ? { certificateUrl: payload.certificateUrl } : {}),
        ...(payload.isLoading !== undefined ? { isLoading: payload.isLoading } : {}),
        ...(payload.loadingText !== undefined ? { loadingText: payload.loadingText } : {}),
        ...(payload.fileName !== undefined ? { fileName: payload.fileName } : {}),
      },
    })),

  closePreviewModal: () =>
    set(() => ({
      previewModal: {
        isOpen: false,
        certificateUrl: null,
        isLoading: false,
        loadingText: 'Loading certificate...',
        fileName: 'certificate',
      },
    })),

  getCertificate: async (certificate_id: string) => {
    if (!certificate_id) {
      toast.error('Missing certificate ID');
      return null;
    }

    const cacheKey = certificate_id;

    return performanceUtils.measureOperation('getCertificate', async () => {
      set((s) => ({
        loadingCertificates: {
          ...s.loadingCertificates,
          [cacheKey]: true
        },
        errors: {
          ...s.errors,
          [cacheKey]: null
        }
      }));

      try {
        const response = await apiClient.get<CertificateData>(
          `/certificates/${certificate_id}?_ts=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );

        if (response.certificate_url) {
          set((s) => ({
            loadingCertificates: {
              ...s.loadingCertificates,
              [cacheKey]: false
            }
          }));

          return {
            certificateUrl: withFreshCertificateUrl(response.certificate_url),
          };
        }

        throw new Error('No certificate URL received from server');
      } catch (error) {
        console.error('Certificate fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch certificate';

        set((s) => ({
          errors: {
            ...s.errors,
            [cacheKey]: errorMessage
          },
          loadingCertificates: {
            ...s.loadingCertificates,
            [cacheKey]: false
          }
        }));

        toast.error(errorMessage);
        throw error;
      }
    });
  },
}));
