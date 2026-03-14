export const prismColors = [
  "#f25447",
  "#f89a40",
  "#f8de47",
  "#7dcc58",
  "#28b965",
  "#2885e7",
  "#9150a6",
];

interface PrismStripesProps {
  className?: string;
  variant?: "horizontal" | "vertical";
  thickness?: number;
}

export function PrismStripes({ className = "", variant = "horizontal", thickness = 4 }: PrismStripesProps) {
  if (variant === "horizontal") {
    return (
      <div className={`flex flex-row ${className}`} style={{ height: thickness }}>
        {prismColors.map((color) => (
          <div
            key={color}
            className="flex-1 h-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    );
  }

  // Vertical variant
  return (
    <div className={`shrink-0 flex flex-row items-stretch ${className}`} style={{ width: thickness * prismColors.length }}>
      {prismColors.map((color) => (
        <div
          key={color}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
