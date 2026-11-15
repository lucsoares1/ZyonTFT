import { useEffect, useState } from "react";
import { Check, Pin } from "lucide-react";
import { matchShop } from "./shop.mjs";
export default function ScreenshotProof() {
  const [fixture, setFixture] = useState<any>(null);
  useEffect(() => {
    window.zyon?.getFixture().then(setFixture);
  }, []);
  if (!fixture) return <p>Aguardando captura de teste.</p>;
  const matched = matchShop(fixture.recognized, fixture.selected);
  const { geometry: g, width, height } = fixture;
  return (
    <main className="screenshot-proof" style={{ width, height }}>
      <img
        src={fixture.image}
        alt="Captura original enviada para validar o OCR"
      />
      <div className="proof-summary">
        <Check size={15} />
        <strong>ZYON · TESTE OCR</strong>
        <span>Comp de teste: Vi, Alistar e Rubrivirim</span>
        <b>5/5 nomes lidos · 3 destaques</b>
      </div>
      {matched.map((s: any) => (
        <div
          key={s.index}
          className={`proof-slot ${s.highlighted ? "proof-matched" : ""}`}
          data-slot={s.index + 1}
          data-highlighted={s.highlighted}
          style={{
            left: g.left + g.slotWidth * s.index + 3,
            top: g.top,
            width: g.slotWidth - 8,
            height: g.height,
          }}
        >
          {s.highlighted && (
            <span className="proof-badge">
              <Pin size={12} fill="currentColor" />
              Na sua comp
            </span>
          )}
        </div>
      ))}
    </main>
  );
}
