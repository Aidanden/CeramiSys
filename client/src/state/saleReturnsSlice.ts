import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SaleReturnLine {
  productId: number;
  qty: number;
  unitPrice: number;
  subTotal: number;
}

export interface SaleReturnFormState {
  saleId: number | null;
  customerId: number | null;
  reason: string;
  notes: string;
  refundMethod: 'CASH' | 'BANK' | 'CARD' | null;
  lines: SaleReturnLine[];
}

interface SaleReturnsState {
  currentPage: number;
  searchTerm: string;
  statusFilter: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'RECEIVED_WAREHOUSE' | '';
  showCreateModal: boolean;
  showDetailsModal: boolean;
  selectedReturnId: number | null;
  returnForm: SaleReturnFormState;
}

const initialState: SaleReturnsState = {
  currentPage: 1,
  searchTerm: '',
  statusFilter: '',
  showCreateModal: false,
  showDetailsModal: false,
  selectedReturnId: null,
  returnForm: {
    saleId: null,
    customerId: null,
    reason: '',
    notes: '',
    refundMethod: null,
    lines: []
  }
};

const saleReturnsSlice = createSlice({
  name: 'saleReturns',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED' | 'RECEIVED_WAREHOUSE' | ''>) => {
      state.statusFilter = action.payload;
    },
    setShowCreateModal: (state, action: PayloadAction<boolean>) => {
      state.showCreateModal = action.payload;
    },
    setShowDetailsModal: (state, action: PayloadAction<boolean>) => {
      state.showDetailsModal = action.payload;
    },
    setSelectedReturnId: (state, action: PayloadAction<number | null>) => {
      state.selectedReturnId = action.payload;
    },
    setReturnForm: (state, action: PayloadAction<Partial<SaleReturnFormState>>) => {
      state.returnForm = { ...state.returnForm, ...action.payload };
    },
    resetReturnForm: (state) => {
      state.returnForm = initialState.returnForm;
    },
    addReturnLine: (state) => {
      state.returnForm.lines.push({
        productId: 0,
        qty: 1,
        unitPrice: 0,
        subTotal: 0
      });
    },
    updateReturnLine: (state, action: PayloadAction<{ index: number; field: keyof SaleReturnLine; value: any }>) => {
      const { index, field, value } = action.payload;
      if (state.returnForm.lines[index]) {
        state.returnForm.lines[index][field] = value;

        // حساب الإجمالي الفرعي
        if (field === 'qty' || field === 'unitPrice') {
          const line = state.returnForm.lines[index];
          line.subTotal = line.qty * line.unitPrice;
        }
      }
    },
    removeReturnLine: (state, action: PayloadAction<number>) => {
      state.returnForm.lines.splice(action.payload, 1);
    },
    resetState: () => initialState
  }
});

export const {
  setCurrentPage,
  setSearchTerm,
  setStatusFilter,
  setShowCreateModal,
  setShowDetailsModal,
  setSelectedReturnId,
  setReturnForm,
  resetReturnForm,
  addReturnLine,
  updateReturnLine,
  removeReturnLine,
  resetState
} = saleReturnsSlice.actions;

export default saleReturnsSlice.reducer;
