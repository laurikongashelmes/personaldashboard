import { NextResponse } from 'next/server';
import { fetchEnergy } from '@/lib/energy';

export async function GET() {
  try {
    const data = await fetchEnergy();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch energy data' }, { status: 500 });
  }
}
