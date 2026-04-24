import type { TickerData } from '@/types';
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

function formatChange(change: number, changePercent: number): { text: string; color: 'green' | 'red' } {
  const arrow = change >= 0 ? '▲' : '▼';
  const sign = changePercent >= 0 ? '+' : '−';
  const abs = Math.abs(changePercent).toFixed(2);
  return {
    text: `${arrow} ${sign}${abs}%`,
    color: change >= 0 ? 'green' : 'red',
  };
}

export default function MarketsSection({ data, loading, error }: Props) {
  return (
    <section>
      <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
        Markets
      </h2>
      <div className="flex gap-4 flex-wrap">
        {loading
          ? [1, 2].map(i => <div key={i} className="flex-1 min-w-40"><Widget label="" value="" loading /></div>)
          : error
          ? <p className="text-sm text-red-400">{error}</p>
          : data.map(ticker => {
              if (ticker.price == null) {
                return <Widget key={ticker.symbol} label={ticker.label} value="—" error="Unavailable" />;
              }
              const { text, color } = formatChange(ticker.change!, ticker.changePercent!);
              return (
                <div key={ticker.symbol} className="flex-1 min-w-40">
                  <Widget
                    label={ticker.label}
                    value={formatPrice(ticker.price, ticker.symbol)}
                    subValue={text}
                    subValueColor={color}
                  />
                </div>
              );
            })}
      </div>
    </section>
  );
}
