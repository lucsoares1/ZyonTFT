import { useId } from "react";

export function ShopFrostFrame() {
  const id=useId().replaceAll(":","");
  return <svg className="shop-frost-frame" viewBox="0 0 200 124" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-ice`} x1="10" y1="0" x2="190" y2="124" gradientUnits="userSpaceOnUse">
        <stop stopColor="#e6faff"/><stop offset=".24" stopColor="var(--shop-accent)"/><stop offset=".5" stopColor="#213c73"/><stop offset=".74" stopColor="var(--shop-accent)"/><stop offset="1" stopColor="#e6faff"/>
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="200" y2="124" gradientUnits="userSpaceOnUse">
        <stop stopColor="#dff6ff" stopOpacity=".62"/><stop offset=".35" stopColor="var(--shop-edge)" stopOpacity=".22"/><stop offset="1" stopColor="#b7e9ff" stopOpacity=".55"/>
      </linearGradient>
    </defs>
    <path d="M11 1 33 2 38 0 61 3 93 2 99 4 132 2 160 3 187 1 198 11 196 28 200 35 197 49 198 81 196 91 199 99 194 116 184 123 155 121 148 124 123 121 98 122 91 120 63 123 43 121 37 124 12 121 2 112 4 96 0 89 3 72 2 47 4 36 1 23 3 12Z M13 8 7 16 9 35 7 48 9 73 7 90 10 109 16 115 42 115 64 117 92 114 123 115 149 117 156 115 182 116 189 110 192 98 190 80 191 49 190 34 192 15 185 8 160 9 132 8 100 10 93 8 62 9 38 6 32 8Z" fill={`url(#${id}-glass)`} fillRule="evenodd"/>
    <path d="m11 1 22 1 5-2 23 3 32-1 6 2 33-2 28 1 27-2 11 10-2 17 4 7-3 14 1 32-2 10 3 8-5 17-10 7-29-2-7 3-25-3-25 1-7-2-28 3-20-2-6 3-25-3-10-9 2-16-4-7 3-17-1-25 2-11-3-13 2-11Z" stroke="#071321" strokeWidth="3"/>
    <path d="m11 1 22 1 5-2 23 3 32-1 6 2 33-2 28 1 27-2 11 10-2 17 4 7-3 14 1 32-2 10 3 8-5 17-10 7-29-2-7 3-25-3-25 1-7-2-28 3-20-2-6 3-25-3-10-9 2-16-4-7 3-17-1-25 2-11-3-13 2-11Z" stroke={`url(#${id}-ice)`} strokeWidth="1.6"/>
    <path d="m13 8-6 8 2 19-2 13 2 25-2 17 3 19 6 6 26 0 22 2 28-3 31 1 26 2 7-2 26 1 7-6 3-12-2-18 1-31-1-15 2-19-7-7-25 1-28-1-32 2-7-2-31 1-24-3-6 2Z" stroke="var(--shop-accent)" strokeOpacity=".72" strokeWidth=".8"/>
    <path d="m3 12 8-11 9 3-7 4-6 8 2 19-5 1Z M1 23l8 12-2 13-5-1Z M2 112l10 9 25 3 6-3-27-6-6-6Z M187 1l11 10-6 4-7-7-25 1Z M196 91l3 8-5 17-10 7-2-7 7-6 3-12Z M148 124l7-3 29 2-2-7-26-1-7 2-26-2Z" fill={`url(#${id}-ice)`} fillOpacity=".67"/>
    <path d="m38 0 4 9 9 5m-9-5-7 2M4 36l8 8-2 12m2-12 7 3m-7 74 8-12-2-10m2 10 10-3m63 14 7-8 12-2m-12 2-4-7m101-56-9 8-3 12m3-12-8-3m-2 67-8-13 3-9m-3 9-13-3m24-106-11 10-12 1" stroke="#def6ff" strokeOpacity=".72" strokeWidth=".8"/>
    <path d="m11 1 22 1m-30 10-2 11m11 98 25 3m150-123 11 10m-4 105-10 7" stroke="#f0fcff" strokeWidth="1.6"/>
  </svg>;
}

export function ShopMedal({ label, kind = "core", preview = false }: {
  label: string; kind?: "buy" | "reserve" | "core" | "send" | "shared"; preview?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <span className={`shop-badge shop-medal ${preview ? "badge-preview" : ""}`} data-kind={kind} role="img" aria-label={`Zyon: ${label}`} title={label}>
      <svg viewBox="0 0 64 76" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-rim`} x1="12" y1="5" x2="52" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dbe4f4"/><stop offset=".25" stopColor="#6e94d5"/><stop offset=".55" stopColor="#1d3765"/><stop offset=".76" stopColor="#a0b9e4"/><stop offset="1" stopColor="#264376"/>
          </linearGradient>
          <linearGradient id={`${id}-face`} x1="19" y1="15" x2="45" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2b3b57"/><stop offset=".5" stopColor="#121b29"/><stop offset="1" stopColor="#090d13"/>
          </linearGradient>
          <linearGradient id={`${id}-logo`} x1="18" y1="22" x2="43" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff7ce"/><stop offset=".48" stopColor="#ffd777"/><stop offset="1" stopColor="#b87321"/>
          </linearGradient>
        </defs>
        <path d="m17 45-4 25 11-5 7 8 5-27M36 46l4 25 7-8 10 3-9-26" fill="#1a2539" stroke="#0b1018" strokeWidth="2"/>
        <path d="m19 47-3 17 8-4 5 6 3-19M38 46l4 18 5-6 6 3-7-19" fill="#41629c"/>
        <path d="M24 6h16l17 13 3 20-11 20-17 8-19-9L3 39l4-21Z" fill="#0b1017" stroke="#080b0f" strokeWidth="3" transform="translate(0 3)"/>
        <path d="M24 3h16l17 13 3 20-11 20-17 8-19-9L3 36l4-21Z" fill={`url(#${id}-rim)`}/>
        <path d="m24 8 15 0 14 11 3 17-10 17-14 7-16-8-9-17 4-17Z" fill={`url(#${id}-face)`} stroke="#495e83" strokeWidth="1.5"/>
        <path d="m12 19 13-9h13l13 10M8 35l9 16 15 7" stroke="#d1dcf0" strokeOpacity=".55" strokeWidth="1.2"/>
        <image href="./assets/brand/zyontftlogo.png" x="9" y="9" width="46" height="47"/>
        <path d="m45 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#dee7f5"/>
      </svg>
      <span className="shop-medal-caption">{kind==='send'?'Enviar à dupla':kind==='shared'?'Você + dupla':kind === "buy" ? "Comprar" : kind === "reserve" ? "Transição" : "Sua comp"}</span>
    </span>
  );
}
