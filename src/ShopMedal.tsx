import { useId } from "react";

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
