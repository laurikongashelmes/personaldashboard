'use client';

import { useEffect, useState, useCallback } from 'react';
import type { TickerData, EnergyData, WeatherData } from '@/types';
import MarketsSection from './components/MarketsSection';
import EnergySection from './components/EnergySection';
import WeatherSection from './components/WeatherSection';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Home() {
  const [markets, setMarkets] = useState<TickerData[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  const [energy, setEnergy] = useState<EnergyData | null>(null);
  const [energyLoading, setEnergyLoading] = useState(true);
  const [energyError, setEnergyError] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setMarketsLoading(true);
    setEnergyLoading(true);
    setWeatherLoading(true);

    const [marketsResult, energyResult, weatherResult] = await Promise.allSettled([
      fetch('/api/markets').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch('/api/energy').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
      fetch('/api/weather').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))),
    ]);

    if (marketsResult.status === 'fulfilled') {
      setMarkets(marketsResult.value);
      setMarketsError(null);
    } else {
      setMarketsError('Failed to load markets data');
    }
    setMarketsLoading(false);

    if (energyResult.status === 'fulfilled') {
      setEnergy(energyResult.value);
      setEnergyError(null);
    } else {
      setEnergyError('Failed to load energy data');
    }
    setEnergyLoading(false);

    if (weatherResult.status === 'fulfilled') {
      setWeather(weatherResult.value);
      setWeatherError(null);
    } else {
      setWeatherError('Failed to load weather data');
    }
    setWeatherLoading(false);

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Morning Brief</h1>
          <p className="mt-1 text-sm text-gray-500">{formatDate(new Date())}</p>
          {lastUpdated && (
            <p className="mt-0.5 text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <MarketsSection data={markets} loading={marketsLoading} error={marketsError} />
          <EnergySection data={energy} loading={energyLoading} error={energyError} />
          <WeatherSection data={weather} loading={weatherLoading} error={weatherError} />
        </div>
      </main>
    </div>
  );
}
