import { NextRequest, NextResponse } from 'next/server';
import { fetchChartData } from '@/lib/charts';
import { CHART_TICKERS } from '@/config';
import type { ChartRange } from '@/types';
import type { ChartSymbol } from '@/config';

const VALID_RANGES: ChartRange[] = ['1D', '7D', '1M', '1Y'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') as ChartRange | null;

  if (!symbol || !(CHART_TICKERS as readonly string[]).includes(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
  }

  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const data = await fetchChartData(symbol as ChartSymbol, range);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 });
  }
}
