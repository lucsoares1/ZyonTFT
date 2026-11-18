import { CompactRoster, TraitRail } from './ZyonPieces';
import { CompPerformance } from './CompPerformance';
import type { Comp } from "./data";

export function OverlayRoster({ comp }: { comp: Comp }) {
  return (
    <section className="overlay-roster zy-overlay-team" aria-label="Composição completa fixada">
      <div className="zy-overlay-core"><TraitRail comp={comp}/><CompactRoster comp={comp}/></div>
      <div className="zy-overlay-context"><CompPerformance comp={comp}/></div>
    </section>
  );
}
