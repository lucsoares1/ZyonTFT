import test from "node:test";
import assert from "node:assert/strict";
import {
  STAT_RANKS,
  statsFromCounts,
  normalizeStats,
  enrichPivotStats,
  validStatistics,
} from "../src/pivot-stats.mjs";
const registry = {
  items: ["a", "b", "DA_Component_One"].map((id) => ({ id })),
};
const comp = {
  id: "s18-pivot-test",
  carry: "unit",
  champions: ["unit"],
  source: { url: "https://www.pivottft.com/comps/test/" },
  pivot: { carries: ["unit"] },
};
const sample = () => ({
  v: 1,
  set: 18,
  patch: "18.6",
  made: 1700000000,
  comps: [{ id: "s18-test", slug: "test" }],
  slices: Object.fromEntries(
    STAT_RANKS.map((r) => [
      r,
      { boards: 1000, comps: { "s18-test": [100, 400, 60, 20] } },
    ]),
  ),
});
test("Pivot counts use weighted samples, actual board denominator, Emerald+ only and stable comp identity", () => {
  const d = sample();
  d.slices.IRON = {
    boards: 999999,
    comps: { "s18-test": [9999, 9999, 9999, 9999] },
  };
  d.slices.EMERALD.comps["s18-test"] = [200, 600, 140, 50];
  const s = normalizeStats(d, [comp], {}, registry)[comp.id];
  assert.equal(s.performance.games, 600);
  assert.equal(s.performance.average, 2200 / 600);
  assert.equal(s.performance.top4, 380 / 600);
  assert.equal(s.performance.winRate, 130 / 600);
  assert.equal(s.performance.pickRate, 600 / 5000);
  assert.equal(
    normalizeStats(
      { ...d, comps: [{ id: "s18-test", slug: "wrong" }] },
      [comp],
      {},
      registry,
    )[comp.id],
    null,
  );
  assert.throws(() =>
    normalizeStats({ ...d, patch: "19.1" }, [comp], {}, registry),
  );
});
test("missing, small and impossible samples remain absent instead of fabricated zeros", () => {
  for (const c of [
    [0, 0, 0, 0],
    [99, 396, 50, 10],
    [100, 900, 70, 20],
    [100, 400, 20, 30],
    [100, 400, 110, 5],
    [NaN, 400, 60, 20],
  ])
    assert.equal(statsFromCounts(c, 1000), null);
  const d = sample();
  delete d.slices.DIAMOND;
  assert.throws(() => normalizeStats(d, [comp], {}, registry));
});
test("carry full builds merge identical triples across ranks while retaining duplicate items and rejecting components", () => {
  const detail = {
    slices: Object.fromEntries(
      STAT_RANKS.map((r) => [
        r,
        {
          builds: [
            [
              ["b", "a", "a"],
              [100, 400, 60, 20],
            ],
            [
              ["DA_Component_One", "a", "b"],
              [100, 200, 90, 70],
            ],
            [
              ["unknown", "a", "b"],
              [100, 200, 90, 70],
            ],
          ],
        },
      ]),
    ),
  };
  const s = normalizeStats(sample(), [comp], { unit: detail }, registry)[
    comp.id
  ];
  assert.equal(s.itemBuilds.length, 1);
  assert.deepEqual(s.itemBuilds[0].items, ["a", "a", "b"]);
  assert.equal(s.itemBuilds[0].games, 500);
  assert.ok(validStatistics(s, comp, registry));
  assert.equal(
    validStatistics(
      { ...s, performance: { ...s.performance, average: NaN } },
      comp,
      registry,
    ),
    false,
  );
});
test("optional stats failure retains exact prior source sample and never transfers stats by carry/name", async () => {
  const s = normalizeStats(sample(), [comp], {}, registry)[comp.id],
    previous = {
      comps: [{ ...comp, pivot: { ...comp.pivot, statistics: s } }],
    };
  const snapshot = { edition: { patch: "18.6" }, comps: [comp] };
  const next = await enrichPivotStats(snapshot, registry, {
    previous,
    fetcher: async () => {
      throw Error("offline");
    },
  });
  assert.deepEqual(next.comps[0].pivot.statistics, s);
  assert.ok(next.statisticsError);
  const other = { ...comp, id: "s18-pivot-other" };
  const missing = await enrichPivotStats(
    { ...snapshot, comps: [other] },
    registry,
    {
      previous,
      fetcher: async () => {
        throw Error("offline");
      },
    },
  );
  assert.equal(missing.comps[0].pivot.statistics, undefined);
});
test("enrichment deduplicates champion requests and tolerates a missing champion endpoint", async () => {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    return url.endsWith("data.json")
      ? new Response(JSON.stringify(sample()))
      : new Response("", { status: 404 });
  };
  const next = await enrichPivotStats(
    {
      edition: { patch: "18.6" },
      comps: [comp, { ...comp, id: "s18-pivot-other" }],
    },
    registry,
    { fetcher },
  );
  assert.equal(calls.length, 2);
  assert.equal(next.comps[0].pivot.statistics.performance.average, 4);
  assert.deepEqual(next.comps[0].pivot.statistics.itemBuilds, []);
  assert.equal(next.statisticsError, null);
});

test('a missing champion endpoint keeps only that champion previous validated item sample',async()=>{
  const prior={set:18,patch:'18.6',ranks:'Emerald+',region:'all',made:1699999999,performance:null,itemBuilds:[{championId:'unit',items:['a','b','b'],games:150,average:4,top4:.6,winRate:.2}]};
  const snapshot={edition:{patch:'18.6'},comps:[comp]};
  const fetcher=async url=>url.endsWith('data.json')?new Response(JSON.stringify(sample())):new Response('',{status:404});
  const result=await enrichPivotStats(snapshot,registry,{fetcher,previous:{championStatistics:{unit:prior}},champions:[{id:'unit'}]});
  assert.deepEqual(result.championStatistics.unit,prior);
  const wrongPatch=await enrichPivotStats(snapshot,registry,{fetcher,previous:{championStatistics:{unit:{...prior,patch:'18.5'}}},champions:[{id:'unit'}]});
  assert.deepEqual(wrongPatch.championStatistics.unit.itemBuilds,[]);
  const explicitEmpty=await enrichPivotStats(snapshot,registry,{fetcher:async url=>new Response(JSON.stringify(url.endsWith('data.json')?sample():{slices:{}})),previous:{championStatistics:{unit:prior}},champions:[{id:'unit'}]});
  assert.deepEqual(explicitEmpty.championStatistics.unit.itemBuilds,[]);
});
