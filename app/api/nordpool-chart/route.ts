import { NextRequest, NextResponse } from 'next/server';
import { fetchNordPoolChartData } from '@/lib/nordpool-chart';
import type { NordPoolRange } from '@/types';

const VALID_RANGES: NordPoolRange[] = ['CURRENT', '7D', '1M', '1Y'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') as NordPoolRange | null;

  if (!range || !VALID_RANGES.includes(range)) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  try {
    const data = await fetchNordPoolChartData(range);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 });
  }
}
