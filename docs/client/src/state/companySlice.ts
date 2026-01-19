import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Company } from "./companyApi";

export interface CompanyState {
  selectedCompany: Company | null;
  currentFilter: 'all' | 'parent' | 'branch';
  currentPage: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
  viewMode: 'table' | 'cards' | 'hierarchy';
  sortBy: 'name' | 'code' | 'created' | 'type';
  sortOrder: 'asc' | 'desc';
}

const initialState: CompanyState = {
  selectedCompany: null,
  currentFilter: 'all',
  currentPage: 1,
  searchTerm: '',
  isLoading: false,
  error: null,
  viewMode: 'table',
  sortBy: 'name',
  sortOrder: 'asc',
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    // إدارة الشركة المحددة
    setSelectedCompany: (state, action: PayloadAction<Company | null>) => {
      state.selectedCompany = action.payload;
    },

    // إدارة الفلاتر
    setCurrentFilter: (state, action: PayloadAction<'all' | 'parent' | 'branch'>) => {
      state.currentFilter = action.payload;
      state.currentPage = 1; // إعادة تعيين الصفحة عند تغيير الفلتر
    },

    // إدارة البحث
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.currentPage = 1; // إعادة تعيين الصفحة عند البحث
    },

    // إدارة التصفح
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },

    // إدارة حالة التحميل
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // إدارة الأخطاء
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // إدارة طريقة العرض
    setViewMode: (state, action: PayloadAction<'table' | 'cards' | 'hierarchy'>) => {
      state.viewMode = action.payload;
    },

    // إدارة الترتيب
    setSortBy: (state, action: PayloadAction<'name' | 'code' | 'created' | 'type'>) => {
      state.sortBy = action.payload;
    },

    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },

    // تبديل ترتيب العمود
    toggleSort: (state, action: PayloadAction<'name' | 'code' | 'created' | 'type'>) => {
      if (state.sortBy === action.payload) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = action.payload;
        state.sortOrder = 'asc';
      }
    },

    // إعادة تعيين جميع الفلاتر
    resetFilters: (state) => {
      state.currentFilter = 'all';
      state.searchTerm = '';
      state.currentPage = 1;
      state.sortBy = 'name';
      state.sortOrder = 'asc';
    },

    // إعادة تعيين الحالة بالكامل
    resetCompanyState: (state) => {
      return initialState;
    },
  },
});

export const {
  setSelectedCompany,
  setCurrentFilter,
  setSearchTerm,
  setCurrentPage,
  setLoading,
  setError,
  clearError,
  setViewMode,
  setSortBy,
  setSortOrder,
  toggleSort,
  resetFilters,
  resetCompanyState,
} = companySlice.actions;

export default companySlice.reducer;

// Selectors
export const selectCompanyState = (state: { company: CompanyState }) => state.company;
export const selectSelectedCompany = (state: { company: CompanyState }) => state.company.selectedCompany;
export const selectCurrentFilter = (state: { company: CompanyState }) => state.company.currentFilter;
export const selectSearchTerm = (state: { company: CompanyState }) => state.company.searchTerm;
export const selectCurrentPage = (state: { company: CompanyState }) => state.company.currentPage;
export const selectViewMode = (state: { company: CompanyState }) => state.company.viewMode;
export const selectSortConfig = (state: { company: CompanyState }) => ({
  sortBy: state.company.sortBy,
  sortOrder: state.company.sortOrder
});
