import type { EnergyData } from '@/types';
import TickerCard from './TickerCard';
import NordPoolCard from './NordPoolCard';
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
        <div className="flex-1 min-w-40">
          {loading ? (
            <Widget label="" value="" loading />
          ) : error || !data ? (
            <p className="text-sm text-red-400">{error ?? 'Pole saadaval'}</p>
          ) : (
            <TickerCard
              label="Brent Crude"
              symbol="BZ=F"
              price={data.brent.price}
              change={data.brent.change}
              changePercent={data.brent.changePercent}
              formatValue={(p) => `$${p.toFixed(2)}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-40">
          <NordPoolCard />
        </div>
      </div>
    </section>
  );
}
