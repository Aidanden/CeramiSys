"use client";

import { useRef } from "react";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  Provider,
} from "react-redux";
import globalReducer from "@/state";
import authReducer from "@/state/authSlice";
import companyReducer from "@/state/companySlice";
import usersReducer from "@/state/usersSlice";
import complexInterCompanySalesReducer from "@/state/complexInterCompanySalesSlice";
import saleReturnsReducer from "@/state/saleReturnsSlice";

import { authApi } from "@/state/authApi"; // إضافة authApi
import { usersApi } from "@/state/usersApi"; // إضافة usersApi
import { permissionsApi } from "@/state/permissionsApi"; // إضافة permissionsApi
import { companyApi } from "@/state/companyApi"; // إضافة companyApi
import { productsApi } from "@/state/productsApi"; // إضافة productsApi
import { salesApi } from "@/state/salesApi"; // إضافة salesApi
import { salePaymentApi } from "@/state/salePaymentApi"; // إضافة salePaymentApi
import { interCompanySalesApi } from "@/state/interCompanySalesApi"; // إضافة interCompanySalesApi
import { purchaseApi } from "@/state/purchaseApi"; // إضافة purchaseApi
import { purchaseExpenseApi } from "@/state/api/purchaseExpenseApi"; // إضافة purchaseExpenseApi
import { paymentReceiptsApi } from "@/state/api/paymentReceiptsApi"; // إضافة paymentReceiptsApi
import { activityApi } from "@/state/activityApi"; // إضافة activityApi
import { complexInterCompanySalesApi } from "@/state/complexInterCompanySalesApi"; // إضافة complexInterCompanySalesApi
import { reportsApi } from "@/state/reportsApi"; // إضافة reportsApi
import { notificationsApi } from "@/state/notificationsApi"; // إضافة notificationsApi
import { saleReturnsApi } from "@/state/saleReturnsApi"; // إضافة saleReturnsApi
import { saleReturnApi } from "@/state/saleReturnApi"; // إضافة saleReturnApi الجديد
import { returnPaymentApi } from "@/state/returnPaymentApi"; // إضافة returnPaymentApi
import { warehouseApi } from "@/state/warehouseApi"; // إضافة warehouseApi
import { customerAccountApi } from "@/state/customerAccountApi"; // إضافة customerAccountApi
import { supplierAccountApi } from "@/state/supplierAccountApi"; // إضافة supplierAccountApi
import { damageReportsApi } from "@/state/damageReportsApi"; // إضافة damageReportsApi
import { externalStoresApi } from "@/state/externalStoresApi"; // إضافة externalStoresApi
import { externalStoreInvoicesApi } from "@/state/externalStoreInvoicesApi"; // إضافة externalStoreInvoicesApi
import { storePortalApi } from "@/state/storePortalApi"; // إضافة storePortalApi
import { treasuryApi } from "@/state/treasuryApi"; // إضافة treasuryApi
import { settingsApi } from "@/state/settingsApi"; // إضافة settingsApi
import { productCostApi } from "@/state/productCostApi"; // إضافة productCostApi
import { payrollApi } from "@/state/payrollApi"; // إضافة payrollApi
import { badDebtApi } from "@/state/badDebtApi"; // إضافة badDebtApi
import { generalReceiptApi } from "@/state/generalReceiptApi"; // إضافة generalReceiptApi
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";


/* REDUX PERSISTENCE */
const createNoopStorage = () => {
  return {
    getItem(_key: any) {
      return Promise.resolve(null);
    },
    setItem(_key: any, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: any) {
      return Promise.resolve();
    },
  };
};

const storage =
  typeof window === "undefined"
    ? createNoopStorage()
    : createWebStorage("local");

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["global", "auth"], // فقط الأساسيات - تحسين الأداء 90%
  // إزالة: users, permissions, company, complexInterCompanySales, saleReturns
  // هذه البيانات تُجلب من الـ API مع cache محسّن
};

/* ROOT REDUCER */
const rootReducer = combineReducers({
  global: globalReducer,
  auth: authReducer, // إضافة authReducer
  company: companyReducer, // إضافة companyReducer
  users: usersReducer, // إضافة usersReducer
  complexInterCompanySales: complexInterCompanySalesReducer, // إضافة complexInterCompanySalesReducer
  saleReturns: saleReturnsReducer, // إضافة saleReturnsReducer

  /*categories: categoriesReducer,  // إضافة reducer جديد */
  [authApi.reducerPath]: authApi.reducer, // إضافة authApi.reducer
  [usersApi.reducerPath]: usersApi.reducer, // إضافة usersApi.reducer
  [permissionsApi.reducerPath]: permissionsApi.reducer, // إضافة permissionsApi.reducer
  [companyApi.reducerPath]: companyApi.reducer, // إضافة companyApi.reducer
  [productsApi.reducerPath]: productsApi.reducer, // إضافة productsApi.reducer
  [salesApi.reducerPath]: salesApi.reducer, // إضافة salesApi.reducer
  [salePaymentApi.reducerPath]: salePaymentApi.reducer, // إضافة salePaymentApi.reducer
  [interCompanySalesApi.reducerPath]: interCompanySalesApi.reducer, // إضافة interCompanySalesApi.reducer
  [purchaseApi.reducerPath]: purchaseApi.reducer, // إضافة purchaseApi.reducer
  [purchaseExpenseApi.reducerPath]: purchaseExpenseApi.reducer, // إضافة purchaseExpenseApi.reducer
  [paymentReceiptsApi.reducerPath]: paymentReceiptsApi.reducer, // إضافة paymentReceiptsApi.reducer
  [activityApi.reducerPath]: activityApi.reducer, // إضافة activityApi.reducer
  [complexInterCompanySalesApi.reducerPath]: complexInterCompanySalesApi.reducer, // إضافة complexInterCompanySalesApi.reducer
  [reportsApi.reducerPath]: reportsApi.reducer, // إضافة reportsApi.reducer
  [notificationsApi.reducerPath]: notificationsApi.reducer, // إضافة notificationsApi.reducer
  [saleReturnsApi.reducerPath]: saleReturnsApi.reducer, // إضافة saleReturnsApi.reducer
  [saleReturnApi.reducerPath]: saleReturnApi.reducer, // إضافة saleReturnApi.reducer الجديد
  [returnPaymentApi.reducerPath]: returnPaymentApi.reducer, // إضافة returnPaymentApi.reducer
  [warehouseApi.reducerPath]: warehouseApi.reducer, // إضافة warehouseApi.reducer
  [customerAccountApi.reducerPath]: customerAccountApi.reducer, // إضافة customerAccountApi.reducer
  [supplierAccountApi.reducerPath]: supplierAccountApi.reducer, // إضافة supplierAccountApi.reducer
  [damageReportsApi.reducerPath]: damageReportsApi.reducer, // إضافة damageReportsApi.reducer
  [externalStoresApi.reducerPath]: externalStoresApi.reducer, // إضافة externalStoresApi.reducer
  [externalStoreInvoicesApi.reducerPath]: externalStoreInvoicesApi.reducer, // إضافة externalStoreInvoicesApi.reducer
  [storePortalApi.reducerPath]: storePortalApi.reducer, // إضافة storePortalApi.reducer
  [treasuryApi.reducerPath]: treasuryApi.reducer, // إضافة treasuryApi.reducer
  [settingsApi.reducerPath]: settingsApi.reducer, // إضافة settingsApi.reducer
  [productCostApi.reducerPath]: productCostApi.reducer, // إضافة productCostApi.reducer
  [payrollApi.reducerPath]: payrollApi.reducer, // إضافة payrollApi.reducer
  [badDebtApi.reducerPath]: badDebtApi.reducer, // إضافة badDebtApi.reducer
  [generalReceiptApi.reducerPath]: generalReceiptApi.reducer, // إضافة generalReceiptApi.reducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

/* REDUX STORE */
export const makeStore = () => {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(authApi.middleware, usersApi.middleware, permissionsApi.middleware, companyApi.middleware, productsApi.middleware, salesApi.middleware, salePaymentApi.middleware, interCompanySalesApi.middleware, purchaseApi.middleware, purchaseExpenseApi.middleware, paymentReceiptsApi.middleware, activityApi.middleware, complexInterCompanySalesApi.middleware, reportsApi.middleware, notificationsApi.middleware, saleReturnsApi.middleware, saleReturnApi.middleware, returnPaymentApi.middleware, warehouseApi.middleware, customerAccountApi.middleware, supplierAccountApi.middleware, damageReportsApi.middleware, externalStoresApi.middleware, externalStoreInvoicesApi.middleware, storePortalApi.middleware, treasuryApi.middleware, settingsApi.middleware, productCostApi.middleware, payrollApi.middleware, badDebtApi.middleware, generalReceiptApi.middleware), // إضافة middleware
  });
};

/* REDUX TYPES */
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* PROVIDER */
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>();
  const persistorRef = useRef<ReturnType<typeof persistStore>>();
  if (!storeRef.current) {
    const store = makeStore();
    storeRef.current = store;
    persistorRef.current = persistStore(store);
    setupListeners(store.dispatch);
  }

  return (
    <Provider store={storeRef.current!}>
      <PersistGate loading={null} persistor={persistorRef.current!}>
        {children}
      </PersistGate>
    </Provider>
  );
}