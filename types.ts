export interface TickerData {
  symbol: string;
  label: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

export interface EnergyData {
  brent: TickerData;
}

export interface HourlySlot {
  time: string;
  temp: number;
  description: string;
  emoji: string;
}

export interface TempPoint {
  hour: number; // Tallinn local hour, 0–23
  temp: number; // °C, rounded to integer
}

export interface WeatherData {
  current: {
    temp: number;
    description: string;
    emoji: string;
  };
  hourly: HourlySlot[];
  dailyChart: TempPoint[];
  tomorrow: {
    hourly: HourlySlot[];
    dailyChart: TempPoint[];
  };
}

export type ChartRange = '1D' | '7D' | '1M' | '1Y';

export interface ChartPoint {
  timestamp: number;
  price: number;
}

export interface ChartData {
  points: ChartPoint[];
}

export type NordPoolRange = 'CURRENT' | '7D' | '1M' | '1Y';

export interface NordPoolCurrentData {
  points: ChartPoint[];
  hasTomorrow: boolean;
  currentHourIndex: number;
  currentHourPrice: number | null;
  todayAvgPrice: number;
}

export interface NordPoolHistoryData {
  points: ChartPoint[];
}

export type NordPoolChartData = NordPoolCurrentData | NordPoolHistoryData;
