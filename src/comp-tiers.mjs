export const tierSections = [
  { id: "S", title: "Tier S", description: "Mais fortes neste patch" },
  { id: "A", title: "Tier A", description: "Fortes para seguir no patch" },
  { id: "B", title: "Tier B", description: "Boas com uma abertura favorável" },
  {
    id: "C",
    title: "Tier C",
    description: "Rotas que dependem das condições da partida",
  },
  {
    id: "X",
    title: "Tier X",
    description: "Confira os requisitos antes de seguir esta rota",
  },
  {
    id: "unranked",
    title: "Sem classificação",
    description: "A fonte ainda não informa um tier compatível com este patch",
  },
  {
    id: "legacy",
    title: "Base anterior",
    description: "Curadoria Mobalytics, separada da classificação PivotTFT",
  },
  {
    id: "personal",
    title: "Meus planos",
    description: "Composições personalizadas, sem tier atribuído",
  },
];
export function compTier(comp, { set = 18, patch = "18.6" } = {}) {
  if (!comp.source || comp.style === "Personalizada") return "personal";
  if (comp.source.name !== "PivotTFT" || !comp.pivot) return "legacy";
  if (comp.source.set !== set || comp.source.patch !== patch) return "unranked";
  return ["S", "A", "B", "C", "X"].includes(comp.tier) ? comp.tier : "unranked";
}
export function buildCompSections(
  comps,
  { activeId = "", filter = "Todas", set = 18, patch = "18.6" } = {},
) {
  return tierSections
    .filter((s) => filter === "Todas" || s.id === filter)
    .map((section) => {
      const builds = comps.filter(
        (c) => compTier(c, { set, patch }) === section.id,
      );
      const seen = new Set(),
        rows = [];
      for (const c of builds) {
        if (!c.pivot || section.id === "personal" || section.id === "legacy") {
          rows.push(c);
          continue;
        }
        if (seen.has(c.pivot.family)) continue;
        seen.add(c.pivot.family);
        rows.push(
          builds.find(
            (other) =>
              other.id === activeId && other.pivot?.family === c.pivot.family,
          ) || c,
        );
      }
      return { ...section, comps: rows, builds: builds.length };
    })
    .filter((section) => section.comps.length);
}
