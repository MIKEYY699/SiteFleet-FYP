'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, formatMoney, formatMoneyShort, isValidTimeZone } from './format';

interface AppSettingsContextValue {
  currency: string;
  timezone: string;
  setSettings: (next: { currency?: string; timezone?: string }) => void;
  money: (amount: number) => string;
  moneyShort: (amount: number) => string;
}

const AppSettingsContext = createContext<AppSettingsContextValue | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('currency, timezone').eq('id', 1).maybeSingle();
      if (data?.currency) setCurrency(data.currency);
      if (data?.timezone && isValidTimeZone(data.timezone)) setTimezone(data.timezone);
    };
    load();
  }, []);

  const setSettings = useCallback((next: { currency?: string; timezone?: string }) => {
    if (next.currency) setCurrency(next.currency);
    if (next.timezone && isValidTimeZone(next.timezone)) setTimezone(next.timezone);
  }, []);

  const value = useMemo<AppSettingsContextValue>(() => ({
    currency,
    timezone,
    setSettings,
    money: (amount: number) => formatMoney(amount, currency),
    moneyShort: (amount: number) => formatMoneyShort(amount, currency),
  }), [currency, timezone, setSettings]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within an AppSettingsProvider');
  return ctx;
}
