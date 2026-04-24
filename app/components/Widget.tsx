interface WidgetProps {
  label: string;
  value: string;
  subValue?: string;
  subValueColor?: 'green' | 'red' | 'neutral';
  loading?: boolean;
  error?: string;
}

export default function Widget({
  label,
  value,
  subValue,
  subValueColor = 'neutral',
  loading = false,
  error,
}: WidgetProps) {
  const subColors = {
    green: 'text-green-600',
    red: 'text-red-500',
    neutral: 'text-gray-500',
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
        <div className="h-7 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
        {label}
      </p>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && (
            <p className={`text-sm mt-1 font-medium ${subColors[subValueColor]}`}>
              {subValue}
            </p>
          )}
        </>
      )}
    </div>
  );
}
