import { NextResponse } from 'next/server';
import { fetchWeatherData } from '@/lib/weather-api';
import { TALLINN_COORDS } from '@/config';

export async function GET() {
  try {
    const data = await fetchWeatherData(TALLINN_COORDS);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
