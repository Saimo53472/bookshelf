export default function Stars({ value }: { value: number }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span className="stars" role="img" aria-label={`${value.toFixed(2)} out of 5`}>
      <span className="stars-fill" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
      ★★★★★
    </span>
  );
}

// It shows a fractional rating (like 4.82) by laying a gold row of stars over a grey one and clipping the gold row to the right width.