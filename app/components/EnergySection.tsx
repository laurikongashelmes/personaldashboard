import type { EnergyData } from '@/types';
import TickerCard from './TickerCard';
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
        Energia
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading ? (
          <>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
            <div className="flex-1 min-w-40"><Widget label="" value="" loading /></div>
          </>
        ) : error || !data ? (
          <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
        ) : (
          <>
            <div className="flex-1 min-w-40">
              <TickerCard
                label="Brent Crude"
                symbol="BZ=F"
                price={data.brent.price}
                change={data.brent.change}
                changePercent={data.brent.changePercent}
                formatValue={(p) => `$${p.toFixed(2)}`}
              />
            </div>
            <div className="flex-1 min-w-40">
              <Widget
                label="Nord Pool Kesk"
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
