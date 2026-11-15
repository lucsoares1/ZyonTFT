// Both browser storage and Electron preferences must pass through this migration.
export function migrateSaved(value, defaults, catalog, revision) {
  if (!value || !Array.isArray(value.comps)) return defaults;
  const ids = new Set(catalog.map((c) => c.id));
  const canonical = (id) =>
    ids.has(id)
      ? id
      : catalog.find((c) => c.name.replaceAll(" ", "") === id)?.id;
  const convert = (comp) => {
    const champions = [
      ...new Set((comp.champions || []).map(canonical).filter(Boolean)),
    ];
    return {
      ...comp,
      champions,
      carry: canonical(comp.carry) || champions[0] || defaults.comps[0].carry,
    };
  };
  const stale = value.dataRevision !== revision;
  const legacy = {
    ashe: {
      name: "Ashe e guardiões",
      champions: [
        "Ashe",
        "Sejuani",
        "Braum",
        "Leona",
        "Shen",
        "Varus",
        "Lulu",
        "Jinx",
      ],
    },
    ahri: {
      name: "Círculo arcano",
      champions: ["Ahri", "Syndra", "Kennen", "Lulu", "Shen", "Braum", "Leona"],
    },
    jinx: {
      name: "Jinx sem freio",
      champions: ["Jinx", "Garen", "Braum", "Lulu", "Varus", "Leona"],
    },
  };
  const isOriginalDemo = (c) => {
    const original = legacy[c.id];
    return (
      original &&
      c.style !== "Personalizada" &&
      c.name === original.name &&
      JSON.stringify(c.champions) === JSON.stringify(original.champions)
    );
  };
  const remap = (id) =>
    legacy[id] && value.comps.some((c) => c.id === id && !isOriginalDemo(c))
      ? `comp-legacy-${id}`
      : id;
  const custom = value.comps
    .filter(
      (c) =>
        !isOriginalDemo(c) &&
        (!stale ||
          legacy[c.id] ||
          c.id.startsWith("comp-") ||
          c.style === "Personalizada"),
    )
    .map((c) =>
      convert(
        legacy[c.id]
          ? { ...c, id: remap(c.id), style: "Personalizada", source: undefined }
          : c,
      ),
    );
  const comps = stale
    ? [
        ...defaults.comps.filter((c) => !custom.some((x) => x.id === c.id)),
        ...custom,
      ]
    : custom;
  if (!comps.length)
    return {
      ...defaults,
      ...value,
      comps: defaults.comps,
      active: defaults.active,
      pinned: defaults.pinned,
      selected: defaults.selected,
      version: 2,
      dataRevision: revision,
    };
  const active = comps.some((c) => c.id === remap(value.active))
    ? remap(value.active)
    : comps[0].id;
  const pinned =
    value.pinned === null
      ? null
      : comps.some((c) => c.id === remap(value.pinned))
        ? remap(value.pinned)
        : comps[0].id;
  const selected =
    pinned === remap(value.pinned)
      ? (value.selected || []).map(canonical).filter(Boolean)
      : comps.find((c) => c.id === pinned)?.champions || [];
  return {
    ...defaults,
    ...value,
    version: 2,
    dataRevision: revision,
    comps,
    active,
    pinned,
    selected,
  };
}
