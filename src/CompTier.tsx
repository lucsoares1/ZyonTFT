import { compTier } from "./comp-tiers.mjs";
import type { Comp } from "./data";
import tierS from "./assets/tiers/tier-s.svg";
import tierA from "./assets/tiers/tier-a.svg";
import tierB from "./assets/tiers/tier-b.svg";
const tierIcons: Record<string, string> = { S: tierS, A: tierA, B: tierB };
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
      {tierIcons[tier] ? <img src={tierIcons[tier]} alt="" draggable={false} /> : <svg viewBox="0 0 28 28" aria-hidden="true">
        <path
          d="M8.5 2h11A4.5 4.5 0 0 1 24 6.5V19a3.5 3.5 0 0 1-1.52 2.89l-6.5 4.47a3.5 3.5 0 0 1-3.96 0l-6.5-4.47A3.5 3.5 0 0 1 4 19V6.5A4.5 4.5 0 0 1 8.5 2Z"
          fill="#0e1015"
        />
        <path
          d="M8.5 4h11A2.5 2.5 0 0 1 22 6.5v9a1 1 0 0 1-.43.82l-7 4.81a1 1 0 0 1-1.14 0l-7-4.81A1 1 0 0 1 6 15.5v-9A2.5 2.5 0 0 1 8.5 4ZM6 17.82V19a1.5 1.5 0 0 0 .65 1.24l6.5 4.47a1.5 1.5 0 0 0 1.7 0l6.5-4.47A1.5 1.5 0 0 0 22 19v-1.18l-7.26 4.99a1.3 1.3 0 0 1-1.48 0Z"
          fill="currentColor"
        />
        <text
          x="14"
          y="16"
          textAnchor="middle"
          fill="#101720"
          fontSize="12"
          fontWeight="800"
          fontFamily="Inter Variable, sans-serif"
        >
          {label}
        </text>
      </svg>}
    </span>
  );
}
export function CompTierBadge({ comp }: { comp: Comp }) {
  return <TierBadge tier={compTier(comp)} />;
}
