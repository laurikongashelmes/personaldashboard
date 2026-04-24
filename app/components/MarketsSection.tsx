import type { TickerData } from '@/types';
import TickerCard from './TickerCard';
import Widget from './Widget';

interface Props {
  data: TickerData[];
  loading: boolean;
  error: string | null;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'EURUSD=X') return price.toFixed(4);
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return price.toFixed(2);
}

export default function MarketsSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Turud
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="flex-1 min-w-40">
              <Widget label="" value="" loading />
            </div>
          ))
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          data.map(ticker => (
            <div key={ticker.symbol} className="flex-1 min-w-40">
              <TickerCard
                label={ticker.label}
                symbol={ticker.symbol}
                price={ticker.price}
                change={ticker.change}
                changePercent={ticker.changePercent}
                formatValue={(p) => formatPrice(p, ticker.symbol)}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
