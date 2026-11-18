import { useId } from "react";

export function ShopFrostFrame({index=0,jewel=false}:{index?:number;jewel?:boolean}) {
  const id=useId().replaceAll(":","");
  const edge="M-2.2 -2.2H202.2V152.2H-2.2Z";
  const lip="M-.6 -.6H200.6V150.6H-.6Z";
  const tickY=48+(index%3)*18;
  return <svg className="shop-frost-frame" data-jewel={jewel} viewBox="0 0 200 150" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-rim`} x1="-4" y1="-4" x2="204" y2="154" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--shop-rim-light)"/>
        <stop offset=".24" stopColor="var(--shop-accent)"/>
        <stop offset=".52" stopColor="var(--shop-rim-mid)"/>
        <stop offset=".76" stopColor="var(--shop-rim-soft)"/>
        <stop offset="1" stopColor="var(--shop-rim-end)"/>
      </linearGradient>
      <linearGradient id={`${id}-corner`} x1="0" y1="0" x2="200" y2="150" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--shop-rim-light)"/>
        <stop offset=".5" stopColor="var(--shop-accent)"/>
        <stop offset="1" stopColor="var(--shop-rim-end)"/>
      </linearGradient>
      <linearGradient id={`${id}-join`} x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset=".26" stopColor="white"/><stop offset=".34" stopColor="black"/><stop offset=".66" stopColor="black"/><stop offset=".74" stopColor="white"/>
      </linearGradient>
      <mask id={`${id}-jewel`} x="-14" y="-14" width="228" height="178" maskUnits="userSpaceOnUse">
        <path d="M-14-14H214V164H-14Z" fill="white"/>
        <path d="M-14-14H214V4H-14Z" fill={`url(#${id}-join)`}/>
      </mask>
    </defs>
    <g mask={jewel?`url(#${id}-jewel)`:undefined}>
      {/* Soft plasma outer aura + obsidian armor casing, strictly outside card content */}
      <path d={edge} stroke="var(--shop-accent)" strokeOpacity=".26" strokeWidth="7.8"/>
      <path d={edge} stroke="#050811" strokeWidth="5.2"/>
      <path d={edge} stroke={`url(#${id}-rim)`} strokeWidth="2.8"/>
      <path d={lip} stroke="var(--shop-rim-light)" strokeOpacity=".78" strokeWidth=".7"/>
      {/* Zyon chamfered armor corner brackets */}
      <path d="M-4.6 22V-4.6H26L21.5-1.1H-1.1V17.5Z" fill={`url(#${id}-corner)`} stroke="#050811" strokeWidth=".9"/>
      <path d="M204.6 22V-4.6H174L178.5-1.1H201.1V17.5Z" fill={`url(#${id}-corner)`} stroke="#050811" strokeWidth=".9"/>
      <path d="M-4.6 128V154.6H26L21.5 151.1H-1.1V132.5Z" fill={`url(#${id}-corner)`} stroke="#050811" strokeWidth=".9"/>
      <path d="M204.6 128V154.6H174L178.5 151.1H201.1V132.5Z" fill={`url(#${id}-corner)`} stroke="#050811" strokeWidth=".9"/>
      {/* Crisp corner specular edges */}
      <path d="M-3.2 15V-3.2H19M181-3.2H203.2V15M203.2 135V153.2H181M19 153.2H-3.2V135" stroke="#ffffff" strokeOpacity=".55" strokeWidth=".65"/>
      {/* Signature Zyon angled energy ticks on side rails */}
      <path d={`M-4.8 ${tickY}L-1.2 ${tickY-4.5}V${tickY+7.5}L-4.8 ${tickY+12}Z`} fill="var(--shop-rim-light)"/>
      <path d={`M204.8 ${150-tickY}L201.2 ${150-tickY-4.5}V${150-tickY+7.5}L204.8 ${150-tickY+12}Z`} fill="var(--shop-rim-light)"/>
      {/* Bottom tactical lock-on anchor bar */}
      <path d="M74 150.8H126L121.5 155.4H78.5Z" fill="#050811"/>
      <path d="M77.5 151.4H122.5L119.5 154.2H80.5Z" fill={`url(#${id}-corner)`}/>
    </g>
    {/* Angled plasma terminals framing the Riot cost jewel when present */}
    {jewel && <>
      <path d="M51 -4.4H62L58.5 -0.8H49Z" fill="var(--shop-rim-light)" stroke="#050811" strokeWidth=".7"/>
      <path d="M149 -4.4H138L141.5 -0.8H151Z" fill="var(--shop-rim-light)" stroke="#050811" strokeWidth=".7"/>
    </>}
  </svg>;
}

export function ShopMedal({ label, kind = "core", preview = false, priority = 0 }: {
  label: string; kind?: "buy" | "reserve" | "core" | "send" | "shared" | "trait"; preview?: boolean; priority?: number;
}) {
  const id = useId().replaceAll(":", "");
  const isDuo = kind === "send" || kind === "shared";
  const caption =
    kind === "send"
      ? priority === 2 ? "Enviar urgente" : priority === 1 ? "Enviar · Alta" : "Enviar"
      : kind === "shared"
        ? priority === 2 ? "Ambos · Urgente" : priority === 1 ? "Ambos · Alta" : "Ambos"
        : kind === "trait"
          ? "Sinergia"
          : kind === "buy"
            ? "Comprar"
            : kind === "reserve"
              ? "Guardar"
              : "Comp";
  return (
    <span className={`shop-badge shop-medal ${preview ? "badge-preview" : ""}`} data-kind={kind} data-priority={priority} role="img" aria-label={`Zyon: ${label}`} title={label}>
      <svg className="shop-medal-crest" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-crest-rim`} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--shop-rim-light)"/>
            <stop offset=".45" stopColor="var(--shop-accent)"/>
            <stop offset="1" stopColor="var(--shop-rim-end)"/>
          </linearGradient>
          <linearGradient id={`${id}-crest-bg`} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--shop-badge-top, #162844)"/>
            <stop offset="1" stopColor="var(--shop-badge-bot, #070d18)"/>
          </linearGradient>
        </defs>
        {/* Chamfered Zyon tactical diamond-hex shield */}
        <path d="M12 2.5H28L37.5 12V28L28 37.5H12L2.5 28V12Z" fill="#050811" stroke="#050811" strokeWidth="2.5"/>
        <path d="M12.4 3.5H27.6L36.5 12.4V27.6L27.6 36.5H12.4L3.5 27.6V12.4Z" fill={`url(#${id}-crest-bg)`} stroke={`url(#${id}-crest-rim)`} strokeWidth="2.2"/>
        {/* Inner diagonal specular slash */}
        <path d="M8.5 13L15.5 6H23.5L7.5 22Z" fill="var(--shop-rim-light)" fillOpacity=".14"/>
        {/* Authentic Zyon Z-Star logo */}
        <image className="shop-medal-logo" href="./assets/brand/zyontftlogo.png" x="7" y="7" width="26" height="26"/>
        {/* Duo transmission chevron indicator in lower-right notch */}
        {isDuo && (
          <g>
            <circle cx="31.5" cy="31.5" r="7" fill="#090714" stroke="var(--shop-rim-light)" strokeWidth="1.4"/>
            <path d="M28.5 31.5H34M31.6 28.8L34.4 31.5L31.6 34.2" stroke="var(--shop-rim-light)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        )}
      </svg>
      <span className="shop-medal-caption">
        <span className="shop-medal-text">{caption}</span>
      </span>
    </span>
  );
}
