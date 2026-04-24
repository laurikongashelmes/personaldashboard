import { NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/markets';
import { TICKERS } from '@/config';

export async function GET() {
  try {
    const data = await fetchMarketData(TICKERS);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
