const fs = require("node:fs");
const path = require("node:path");
const bundled = require("../src/generated/pivot.json");
const registry = require("../src/generated/pivot-registry.json");
const catalog = require("../src/generated/catalog.json");
function createPivotService(folder, { fetcher = fetch } = {}) {
  const file = path.join(folder, "pivot-catalog-v1.json");
  let snapshot = bundled,
    pending,
    lastAttempt = 0,
    error = null;
  const adapter = () => import("../src/pivot-catalog.mjs");
  const ready = (async () => {
    try {
      const cached = JSON.parse(fs.readFileSync(file, "utf8"));
      const { validateComps } = await import("../src/comp-catalog.mjs");
      const {validStatistics}=await import('../src/pivot-stats.mjs');
      validateComps(cached.comps, catalog.champions, registry.items);
      if(cached.comps.some(c=>c.pivot?.statistics&&!validStatistics(c.pivot.statistics,c,registry)))throw Error('Estatísticas em cache inválidas');
      if(Object.entries(cached.championStatistics||{}).some(([id,s])=>!catalog.champions.some(c=>c.id===id)||!validStatistics(s,{champions:[id]},registry)))throw Error('Estatísticas de campeão inválidas');
      if (
        cached.edition.setNumber !== 18 ||
        cached.edition.patch !== "18.6" ||
        !Number.isFinite(Date.parse(cached.fetchedAt)) ||
        cached.comps.length < bundled.comps.length * 0.8 ||
        !Array.isArray(cached.tiers?.items) ||
        !cached.tiers.items.length ||
        !Array.isArray(cached.tiers?.augments) ||
        !cached.tiers.augments.length ||
        cached.tiers.items.some(
          (t) =>
            !registry.items.some((i) => i.id === t.id) ||
            typeof t.tier !== "string",
        ) ||
        cached.tiers.augments.some(
          (t) => !registry.augments[t.id] || typeof t.tier !== "string",
        ) ||
        Date.parse(cached.fetchedAt) > Date.now() + 86400000
      )
        throw Error("Cache incompatível");
      if (Date.parse(cached.fetchedAt) >= Date.parse(bundled.fetchedAt))
        snapshot = cached;
    } catch {
      /* The bundled snapshot is always available. */
    }
  })();
  const status = () => ({
    snapshot,
    error,
    refreshing: Boolean(pending),
    lastAttempt: lastAttempt || null,
  });
  async function refresh(force = false) {
    await ready;
    if (pending) return pending;
    if (
      Date.now() - lastAttempt < 60000 ||
      (!force && Date.now() - Date.parse(snapshot.fetchedAt) < 21600000)
    )
      return status();
    pending = (async () => {
      lastAttempt = Date.now();
      try {
        const { extractPivot, normalizePivot, PIVOT_URL } = await adapter();
        const response = await fetcher(PIVOT_URL, {
          signal: AbortSignal.timeout(20000),
          redirect: "error",
        });
        if (!response.ok) throw Error(`PivotTFT respondeu ${response.status}.`);
        if (Number(response.headers.get("content-length")) > 5000000)
          throw Error("Página maior que o esperado.");
        let next = normalizePivot(
          extractPivot(await response.text()),
          registry,
          catalog.champions,
        );
        if (next.edition.updatedAt < snapshot.edition.updatedAt)
          throw Error("Resposta anterior ao catálogo salvo.");
        if (next.comps.length < snapshot.comps.length * 0.8)
          throw Error("Resposta incompleta. Mantido o catálogo anterior.");
        const {enrichPivotStats}=await import('../src/pivot-stats.mjs');
        next=await enrichPivotStats(next,registry,{fetcher,previous:snapshot,champions:catalog.champions});
        const temp = file + ".tmp";
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(temp, JSON.stringify(next));
        fs.renameSync(temp, file);
        snapshot = next;
        error = null;
      } catch (e) {
        error = e.message || "Não foi possível atualizar o PivotTFT.";
      } finally {
        pending = null;
      }
      return status();
    })();
    return pending;
  }
  return {
    get: async () => {
      await ready;
      return status();
    },
    refresh,
  };
}
module.exports = { createPivotService };
