import { combineReducers } from "@reduxjs/toolkit";
import { dashboardApi } from "./dashboardApi";
import { nationalitsApi } from "./nationalitsApi";
import { customersApi } from "./customersApi";
import { currenciesApi } from "./currenciesApi";
import { buysApi } from "./buysApi";
import { salesApi } from "./salesApi";
import { debtsApi } from "./debtsApi";

export const rootApiReducer = combineReducers({
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [nationalitsApi.reducerPath]: nationalitsApi.reducer,
  [customersApi.reducerPath]: customersApi.reducer,
  [currenciesApi.reducerPath]: currenciesApi.reducer,
  [buysApi.reducerPath]: buysApi.reducer,
  [salesApi.reducerPath]: salesApi.reducer,
  [debtsApi.reducerPath]: debtsApi.reducer,
});

export const rootApiMiddleware = [
  dashboardApi.middleware,
  nationalitsApi.middleware,
  customersApi.middleware,
  currenciesApi.middleware,
  buysApi.middleware,
  salesApi.middleware,
  debtsApi.middleware,
];
