import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "./usersApi";

export interface UsersState {
  selectedUser: User | null;
  currentFilter: string;
  currentPage: number;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
  viewMode: 'table' | 'cards';
  sortBy: 'name' | 'username' | 'role' | 'created' | 'status';
  sortOrder: 'asc' | 'desc';
  showSystemUsers: boolean;
}

const initialState: UsersState = {
  selectedUser: null,
  currentFilter: 'all',
  currentPage: 1,
  searchTerm: '',
  isLoading: false,
  error: null,
  viewMode: 'table',
  sortBy: 'name',
  sortOrder: 'asc',
  showSystemUsers: true, // Show system users by default
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    // إدارة المستخدم المحدد
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },

    // إدارة الفلاتر
    setCurrentFilter: (state, action: PayloadAction<string>) => {
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
    setViewMode: (state, action: PayloadAction<'table' | 'cards'>) => {
      state.viewMode = action.payload;
    },

    // إدارة الترتيب
    setSortBy: (state, action: PayloadAction<'name' | 'username' | 'role' | 'created' | 'status'>) => {
      state.sortBy = action.payload;
    },

    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },

    // تبديل ترتيب العمود
    toggleSort: (state, action: PayloadAction<'name' | 'username' | 'role' | 'created' | 'status'>) => {
      if (state.sortBy === action.payload) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = action.payload;
        state.sortOrder = 'asc';
      }
    },

    // إدارة عرض مستخدمي النظام
    setShowSystemUsers: (state, action: PayloadAction<boolean>) => {
      state.showSystemUsers = action.payload;
    },

    // إعادة تعيين جميع الفلاتر
    resetFilters: (state) => {
      state.currentFilter = 'all';
      state.searchTerm = '';
      state.currentPage = 1;
      state.sortBy = 'name';
      state.sortOrder = 'asc';
      state.showSystemUsers = true; // Show system users by default
    },

    // إعادة تعيين الحالة بالكامل
    resetUsersState: (state) => {
      return initialState;
    },
  },
});

export const {
  setSelectedUser,
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
  setShowSystemUsers,
  resetFilters,
  resetUsersState,
} = usersSlice.actions;

export default usersSlice.reducer;

// Selectors
export const selectUsersState = (state: { users: UsersState }) => state.users;
export const selectSelectedUser = (state: { users: UsersState }) => state.users.selectedUser;
export const selectCurrentFilter = (state: { users: UsersState }) => state.users.currentFilter;
export const selectSearchTerm = (state: { users: UsersState }) => state.users.searchTerm;
export const selectCurrentPage = (state: { users: UsersState }) => state.users.currentPage;
export const selectViewMode = (state: { users: UsersState }) => state.users.viewMode;
export const selectSortConfig = (state: { users: UsersState }) => ({
  sortBy: state.users.sortBy,
  sortOrder: state.users.sortOrder
});
export const selectShowSystemUsers = (state: { users: UsersState }) => state.users.showSystemUsers;
