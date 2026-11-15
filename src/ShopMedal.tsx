import { useId } from "react";

export function ShopFrostFrame({index=0,jewel=false}:{index?:number;jewel?:boolean}) {
  const id=useId().replaceAll(":","");
  const edge="M-2.5 -2.5H202.5V152.5H-2.5Z";
  const lip="M-.5 -.5H200.5V150.5H-.5Z";
  const left=32+(index%3)*23,right=94-(index%3)*19,bottom=143-(index%3)*17;
  return <svg className="shop-frost-frame" data-jewel={jewel} viewBox="0 0 200 150" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-rim`} x1="-4" y1="-4" x2="204" y2="154" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--shop-rim-light)"/><stop offset=".19" stopColor="var(--shop-rim-mid)"/><stop offset=".42" stopColor="var(--shop-rim-dark)"/><stop offset=".67" stopColor="var(--shop-accent)"/><stop offset=".85" stopColor="var(--shop-rim-soft)"/><stop offset="1" stopColor="var(--shop-rim-end)"/>
      </linearGradient>
      <linearGradient id={`${id}-join`} x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset=".27" stopColor="white"/><stop offset=".35" stopColor="black"/><stop offset=".65" stopColor="black"/><stop offset=".73" stopColor="white"/>
      </linearGradient>
      <mask id={`${id}-jewel`} x="-12" y="-12" width="224" height="174" maskUnits="userSpaceOnUse">
        <path d="M-12-12H212V162H-12Z" fill="white"/>
        <path d="M-12-12H212V2H-12Z" fill={`url(#${id}-join)`}/>
      </mask>
    </defs>
    <g mask={jewel?`url(#${id}-jewel)`:undefined}>
    {/* The entire crystal rim sits OUTSIDE the original card. */}
    <path d={edge} stroke="#07111f" strokeWidth="5"/>
    <path d={edge} stroke={`url(#${id}-rim)`} strokeWidth="3.6"/>
    <path d={lip} stroke="var(--shop-rim-soft)" strokeOpacity=".8" strokeWidth=".65"/>
    <path d="M-3 19V-3h29M174-3h29v20M203 131v22h-27M26 153H-3v-20" stroke="var(--shop-rim-light)" strokeOpacity=".8" strokeWidth=".8"/>
    {/* Short fractures split the material, never the portrait or its text. */}
    <path d={`M-4.5 ${left}l4 5-3 4M204.5 ${right}l-4 4 3 5M${bottom} 154.5l-5-4-6 3M24-4.5l6 4 5-3`} stroke="var(--shop-rim-dark)" strokeWidth="1"/>
    <path d={`M-4.5 ${left+1}l3 4M204.5 ${right+1}l-3 3M${bottom-1} 154.5l-4-3M25-4.5l5 3`} stroke="var(--shop-rim-light)" strokeOpacity=".75" strokeWidth=".5"/>
    </g>
  </svg>;
}

export function ShopMedal({ label, kind = "core", preview = false, priority = 0 }: {
  label: string; kind?: "buy" | "reserve" | "core" | "send" | "shared" | "trait"; preview?: boolean; priority?: number;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <span className={`shop-badge shop-medal ${preview ? "badge-preview" : ""}`} data-kind={kind} data-priority={priority} role="img" aria-label={`Zyon: ${label}`} title={label}>
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
      <span className="shop-medal-caption">{kind==='send'?priority===2?'Enviar urgente':priority===1?'Enviar · Alta':'Enviar':kind==='shared'?priority===2?'Ambos · Urgente':priority===1?'Ambos · Alta':'Ambos':kind==='trait'?'Sinergia':kind === "buy" ? "Comprar" : kind === "reserve" ? "Guardar" : "Comp"}</span>
    </span>
  );
}
