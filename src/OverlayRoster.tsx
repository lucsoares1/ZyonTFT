import { UnitStrip } from "./TftPanels";
import type { Comp } from "./data";

export function OverlayRoster({ comp }: { comp: Comp }) {
  const flex =
    comp.pivot?.upgrades.filter((id) => !comp.champions.includes(id)) || [];
  const stars = comp.champions.some((id) => comp.stars?.[id] === 3);
  return (
    <section className="overlay-roster" aria-label="Composição completa fixada">
      <div className="overlay-roster-group">
        <UnitStrip comp={comp} showStars={stars} />
        <span className="overlay-roster-label">Núcleo</span>
      </div>
      {flex.length > 0 && (
        <div className="overlay-roster-group overlay-roster-flex">
          <UnitStrip
            comp={{ ...comp, items: {} }}
            ids={flex}
            showStars={stars}
          />
          <span className="overlay-roster-label">Flex</span>
        </div>
      )}
    </section>
  );
}
