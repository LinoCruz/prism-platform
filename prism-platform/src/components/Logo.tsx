export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div className="flex items-end gap-1">
      <span
        className={`${sizeClasses[size]} font-bold tracking-wide leading-none`}
        style={{ color: "rgba(230, 239, 255, 1)" }}
      >
        Prism
      </span>
      <span
        className={`${dotSizes[size]} rounded-full inline-block mb-[2px]`}
        style={{ backgroundColor: "rgba(52, 67, 218, 1)" }}
      />
    </div>
  );
}
