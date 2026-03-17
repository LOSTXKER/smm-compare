"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CurrencyContextType {
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;
  rates: Record<string, number>;
  convert: (amount: number, fromCurrency: string) => number;
  currencies: string[];
  loading: boolean;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  displayCurrency: "THB",
  setDisplayCurrency: () => {},
  rates: {},
  convert: (amount) => amount,
  currencies: [],
  loading: true,
  refreshRates: async () => {},
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState("THB");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/exchange-rates");
      const data = await res.json();
      if (data.rates) setRates(data.rates);
      if (data.currencies?.length > 0) {
        setCurrencies(data.currencies);
      } else {
        setCurrencies(["THB", "USD", "EUR", "IDR"]);
      }
    } catch {
      setCurrencies(["THB", "USD", "EUR", "IDR"]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRates = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/exchange-rates", { method: "POST", body: JSON.stringify({ base: "USD" }) });
      await fetchRates();
    } catch {
      setLoading(false);
    }
  }, [fetchRates]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = useCallback(
    (amount: number, fromCurrency: string) => {
      if (fromCurrency === displayCurrency) return amount;
      if (Object.keys(rates).length === 0) return amount;

      const fromRate = rates[fromCurrency] || 1;
      const toRate = rates[displayCurrency] || 1;
      return (amount / fromRate) * toRate;
    },
    [displayCurrency, rates]
  );

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        setDisplayCurrency,
        rates,
        convert,
        currencies,
        loading,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
