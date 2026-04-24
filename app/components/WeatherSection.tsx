import type { WeatherData } from '@/types';

interface Props {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

export default function WeatherSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Weather · Tallinn
      </h2>
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-28 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="flex gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 rounded flex-1" />)}
          </div>
        </div>
      ) : error || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-400">{error ?? 'Unavailable'}</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-4xl font-bold text-gray-900 mb-1">
            {data.current.temp}°C {data.current.emoji}
          </p>
          <p className="text-sm text-gray-500 mb-4">{data.current.description}</p>
          {data.hourly.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {data.hourly.slice(0, 6).map(slot => (
                <div
                  key={slot.time}
                  className="flex flex-col items-center bg-gray-50 rounded-lg px-3 py-2 min-w-14"
                >
                  <span className="text-xs text-gray-400 mb-1">{slot.time}</span>
                  <span className="text-lg">{slot.emoji}</span>
                  <span className="text-sm font-semibold text-gray-700">{slot.temp}°</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
