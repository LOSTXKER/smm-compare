import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma/client";

const EXCHANGE_API = "https://api.exchangerate-api.com/v4/latest";

export async function fetchAndSaveRates(base: string = "USD"): Promise<number> {
  const res = await fetch(`${EXCHANGE_API}/${base}`);
  if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`);

  const data = await res.json();
  const rates: Record<string, number> = data.rates;
  let saved = 0;

  for (const [currency, rate] of Object.entries(rates)) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_currency: { baseCurrency: base, currency },
      },
      update: { rate: new Prisma.Decimal(rate) },
      create: {
        baseCurrency: base,
        currency,
        rate: new Prisma.Decimal(rate),
      },
    });
    saved++;
  }

  return saved;
}

export async function convertRate(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const rate = await prisma.exchangeRate.findUnique({
    where: {
      baseCurrency_currency: { baseCurrency: fromCurrency, currency: toCurrency },
    },
  });

  if (rate) return amount * Number(rate.rate);

  const fromUsd = await prisma.exchangeRate.findUnique({
    where: { baseCurrency_currency: { baseCurrency: "USD", currency: fromCurrency } },
  });
  const toUsd = await prisma.exchangeRate.findUnique({
    where: { baseCurrency_currency: { baseCurrency: "USD", currency: toCurrency } },
  });

  if (fromUsd && toUsd) {
    return (amount / Number(fromUsd.rate)) * Number(toUsd.rate);
  }

  return amount;
}

export async function getAvailableCurrencies(): Promise<string[]> {
  const currencies = await prisma.exchangeRate.findMany({
    where: { baseCurrency: "USD" },
    select: { currency: true },
    orderBy: { currency: "asc" },
  });
  return currencies.map((c) => c.currency);
}

export async function getAllRates(): Promise<Record<string, number>> {
  const rates = await prisma.exchangeRate.findMany({
    where: { baseCurrency: "USD" },
  });
  const result: Record<string, number> = {};
  for (const r of rates) {
    result[r.currency] = Number(r.rate);
  }
  return result;
}
