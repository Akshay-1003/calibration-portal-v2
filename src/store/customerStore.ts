import { create } from "zustand";

// Define the shape of the customer form data
export type CustomerFormData = {
  companyName: string;
  contactPerson: string;
  address: string;
  email: string;
  contact: string;
  gstNo: string;
  gstType: string;
  billingRateType: string;
  discountRate: number;
};

type CustomerFormStore = {
  formData: CustomerFormData | null;
  setFormData: (data: CustomerFormData) => void;
  resetForm: () => void;
};

// Create Zustand store
export const useCustomerFormStore = create<CustomerFormStore>((set) => ({
  formData: null,
  setFormData: (data) => set({ formData: data }),
  resetForm: () =>
    set({
      formData: null,
    }),
}));
