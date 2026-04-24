export interface TickerData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface NordPoolStats {
  avgPrice: number;
  minPrice: number;
  minHour: string; // e.g. "03:00"
}

export interface EnergyData {
  brent: TickerData;
  nordPool: NordPoolStats;
}

export interface HourlySlot {
  time: string;  // e.g. "15:00"
  temp: number;
  description: string;
  emoji: string;
}

export interface WeatherData {
  currentTemp: number;
  description: string;
  emoji: string;
  hourly: HourlySlot[];
}
