import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ComplexInterCompanySalesState {
  selectedParentCompany: number | null;
  selectedCustomer: number | null;
  profitMargin: number;
  isCreating: boolean;
  error: string | null;
}

const initialState: ComplexInterCompanySalesState = {
  selectedParentCompany: null,
  selectedCustomer: null,
  profitMargin: 20, // 20% هامش ربح افتراضي
  isCreating: false,
  error: null,
};

const complexInterCompanySalesSlice = createSlice({
  name: "complexInterCompanySales",
  initialState,
  reducers: {
    setSelectedParentCompany: (state, action: PayloadAction<number | null>) => {
      state.selectedParentCompany = action.payload;
    },
    setSelectedCustomer: (state, action: PayloadAction<number | null>) => {
      state.selectedCustomer = action.payload;
    },
    setProfitMargin: (state, action: PayloadAction<number>) => {
      state.profitMargin = action.payload;
    },
    setIsCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetComplexSale: (state) => {
      state.selectedParentCompany = null;
      state.selectedCustomer = null;
      state.profitMargin = 20;
      state.isCreating = false;
      state.error = null;
    },
  },
});

export const {
  setSelectedParentCompany,
  setSelectedCustomer,
  setProfitMargin,
  setIsCreating,
  setError,
  resetComplexSale,
} = complexInterCompanySalesSlice.actions;

export default complexInterCompanySalesSlice.reducer;
