import { compTier } from "./comp-tiers.mjs";
import type { Comp } from "./data";
export function TierBadge({
  tier,
  className = "",
}: {
  tier: string;
  className?: string;
}) {
  const label = ["S", "A", "B", "C", "X"].includes(tier)
    ? tier
    : tier === "legacy"
      ? "M"
      : tier === "personal"
        ? "P"
        : "?";
  return (
    <span
      className={`comp-tier-badge ${className}`}
      data-tier={tier}
      aria-label={
        label === "M"
          ? "Curadoria Mobalytics"
          : label === "P"
            ? "Plano personalizado"
            : `Tier ${label}`
      }
    >
      <svg viewBox="0 0 34 42" aria-hidden="true">
        <path
          d="M6 2h22q4 0 4 4v23L17 40 2 29V6q0-4 4-4Z"
          fill="currentColor"
          stroke="#080d13"
          strokeWidth="2"
        />
        <path
          d="m6 29 11 8 11-8"
          fill="none"
          stroke="#141c26"
          strokeWidth="2"
        />
        <text
          x="17"
          y="25"
          textAnchor="middle"
          fill="#101720"
          fontSize="23"
          fontWeight="800"
          fontFamily="Inter Variable, sans-serif"
        >
          {label}
        </text>
      </svg>
    </span>
  );
}
export function CompTierBadge({ comp }: { comp: Comp }) {
  return <TierBadge tier={compTier(comp)} />;
}
