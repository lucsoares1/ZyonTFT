export function ShopFrostFrame(_props: { index?: number; jewel?: boolean }) {
  return null;
}

export function ShopMedal({ label, kind = "core", preview = false, priority = 0 }: {
  label: string; kind?: "buy" | "reserve" | "core" | "send" | "shared" | "trait"; preview?: boolean; priority?: number;
}) {
  return (
    <span className={`shop-badge shop-medal ${preview ? "badge-preview" : ""}`} data-kind={kind} data-priority={priority} role="img" aria-label={`Zyon: ${label}`}>
      <span className="tft-banner" aria-hidden="true">
        <img className="shop-medal-logo" src="./assets/brand/zyontftlogo.png" alt="" draggable={false}/>
      </span>
    </span>
  );
}
