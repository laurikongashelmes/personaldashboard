import type { EnergyData } from '@/types';
import Widget from './Widget';

interface Props {
  data: EnergyData | null;
  loading: boolean;
  error: string | null;
}

export default function EnergySection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Energy
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading ? (
          <>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
          </>
        ) : error || !data ? (
          <p className="text-sm text-red-400">{error ?? 'Unavailable'}</p>
        ) : (
          <>
            <div className="flex-1 min-w-40">
              <Widget
                label="Brent Crude"
                value={data.brent.price != null ? `$${data.brent.price.toFixed(2)}` : '—'}
                subValue={
                  data.brent.changePercent != null
                    ? `${data.brent.changePercent >= 0 ? '▲ +' : '▼ −'}${Math.abs(data.brent.changePercent).toFixed(2)}%`
                    : undefined
                }
                subValueColor={
                  data.brent.changePercent != null
                    ? data.brent.changePercent >= 0 ? 'green' : 'red'
                    : 'neutral'
                }
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool Avg"
                value={`${data.nordPool.avgPrice.toFixed(1)} €/MWh`}
                subValueColor="neutral"
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool Min"
                value={`${data.nordPool.minPrice.toFixed(1)} €/MWh`}
                subValue={data.nordPool.minHour}
                subValueColor="neutral"
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
