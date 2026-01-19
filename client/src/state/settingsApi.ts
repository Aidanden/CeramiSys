import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithAuthInterceptor } from './apiUtils';

export interface GlobalSetting {
    id: number;
    key: string;
    value: string;
    updatedAt: string;
}

export interface ExchangeRates {
    USD_EXCHANGE_RATE: number;
    EUR_EXCHANGE_RATE: number;
}

export const settingsApi = createApi({
    reducerPath: 'settingsApi',
    baseQuery: baseQueryWithAuthInterceptor,
    tagTypes: ['Settings'],
    endpoints: (builder) => ({
        getAllSettings: builder.query<GlobalSetting[], void>({
            query: () => '/settings',
            providesTags: ['Settings'],
        }),
        getExchangeRates: builder.query<ExchangeRates, void>({
            query: () => '/settings/exchange-rates',
            providesTags: ['Settings'],
        }),
        updateSetting: builder.mutation<GlobalSetting, { key: string; value: string | number }>({
            query: (data) => ({
                url: '/settings/update',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Settings'],
        }),
    }),
});

export const {
    useGetAllSettingsQuery,
    useGetExchangeRatesQuery,
    useUpdateSettingMutation,
} = settingsApi;
