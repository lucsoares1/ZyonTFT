// A click is only intent. Require two matching post-purchase frames, an empty
// card (pixels AND OCR), an exact gold debit and unchanged other shop slots.
class PurchaseTracker {
  constructor(catalog) {
    this.catalog = Object.fromEntries(catalog.map((c) => [c.id, c]));
    this.reset();
  }
  reset() {
    this.previous = null;
    this.stable = 0;
    this.pending = null;
  }
  observe(frame) {
    const { at, gold, slots, empty, clicks = [], matchId } = frame;
    if (
      !matchId ||
      !Number.isFinite(at) ||
      !Number.isInteger(gold) ||
      gold < 0 ||
      gold > 999 ||
      !Array.isArray(clicks) ||
      !Array.isArray(slots) ||
      slots.length !== 5 ||
      !Array.isArray(empty) ||
      empty.length !== 5
    ) {
      this.reset();
      return [];
    }
    const same = (a, b) =>
      a.gold === b.gold && a.slots.every((s, i) => s === b.slots[i]);
    const prior = this.previous;
    if (
      prior &&
      (prior.matchId !== matchId || at <= prior.at || at - prior.at > 5000)
    )
      this.reset();
    const baseline = this.pending?.before || this.previous;
    const relevant = clicks.filter(
      (c) => baseline && c.at > baseline.at && c.at <= at && at - c.at < 5000,
    );
    if (relevant.length && baseline && (this.pending || this.stable >= 2)) {
      if (!this.pending)
        this.pending = { before: baseline, clicked: [], hits: 0, since: at };
      for (const click of relevant) {
        const i = click.slot;
        if (
          !Number.isInteger(i) ||
          i < 0 ||
          i > 4 ||
          !this.catalog[baseline.slots[i]]
        ) {
          this.reset();
          this.previous = frame;
          this.stable = 1;
          return [];
        }
        if (!this.pending.clicked.includes(i)) this.pending.clicked.push(i);
      }
    }
    let purchases = [];
    if (this.pending) {
      const p = this.pending;
      const price = p.clicked.reduce(
        (sum, i) => sum + this.catalog[p.before.slots[i]].cost,
        0,
      );
      const cleared = p.clicked.every(
        (i) => slots[i] === null && empty[i] === true,
      );
      const unchanged = p.before.slots.every(
        (s, i) => p.clicked.includes(i) || s === slots[i],
      );
      const paid = gold === p.before.gold - price;
      if (!unchanged || at - p.since > 5000) this.pending = null;
      else {
        p.hits = cleared && paid ? p.hits + 1 : 0;
        if (p.hits >= 2) {
          purchases = p.clicked.map((i) => ({
            id: p.before.slots[i],
            slot: i,
            at,
            cost: this.catalog[p.before.slots[i]].cost,
          }));
          this.pending = null;
        }
      }
    }
    this.stable =
      this.previous && same(this.previous, frame)
        ? Math.min(2, this.stable + 1)
        : 1;
    this.previous = frame;
    return purchases;
  }
}
module.exports = { PurchaseTracker };
