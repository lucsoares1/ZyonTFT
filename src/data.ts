import catalog from "./generated/catalog.json";
import guides from "./generated/comps.json";
import workspace from "./generated/workspace.json";
import pivot from "./generated/pivot.json";
import registry from "./generated/pivot-registry.json";
import itemDetailsData from "./generated/item-details.json";
import { catalogRevision } from "./comp-catalog.mjs";
import { championRole } from "./planning.mjs";
export type Champion = {
  id: string;
  name: string;
  cost: number;
  role: string;
  trait: string;
  traits: string[];
  position: number;
  aliases?: string[];
};
export type Comp = {
  augmentSource?: string;
  pivot?: {
    carries?: string[];
    statistics?: PivotStatistics;
    family: string;
    build: string;
    difficulty: string;
    finalLevel: number;
    levels: PivotLevel[];
    openers: string[];
    itemOrder: string[];
    opening?: {
      rounds: string[];
      pairs: boolean;
      highHealth: boolean;
      components: string[];
      counts?: Record<string, number>;
    };
    augments: string[];
    augmentFocus: string[];
    upgrades: string[];
    updatedAt: number;
  };
  tier?: string;
  conditions?: string[];
  strategy?: {
    damage: string[];
    tank: string[];
    rerollStages: { level: number; targets: string[] }[];
  };
  positions?: Record<string, number>;
  stars?: Partial<Record<string, number>>;
  placement?: "manual";
  id: string;
  name: string;
  subtitle: string;
  style: string;
  champions: string[];
  carry: string;
  color: string;
  description: string;
  items?: Partial<Record<string, string[]>>;
  source?: {
    name: string;
    url: string;
    checkedAt: string;
    patch: string;
    set: number;
  };
};
export type Performance = {games:number;average:number;top4:number;winRate:number;pickRate?:number};
export type PivotStatistics = {set:number;patch:string;ranks:string;region:string;made:number;since?:number;until?:number;performance:Performance|null;itemBuilds:(Performance & {championId:string;items:string[]})[]};
export type PivotLevel = {
  level: number;
  units: string[];
  stage: string;
  swaps: { championId: string; replaces: string }[];
  variants: { championId: string; replaces: string }[][];
  economy: { reserve?: number; floor?: number; until?: string };
};
export const dataset = {
  set: 18,
  name: "Enchanted Wilds",
  patch: "18.6",
  checkedAt: guides
    .map((c) => c.source.checkedAt)
    .sort()[0]
    .split("-")
    .reverse()
    .join("/"),
  revision: catalogRevision([...pivot.comps, ...guides]),
};
export const champions: Champion[] = catalog.champions.map(c=>({...c,role:championRole(c.id,c.role)}));
export const byId: Record<string, Champion> = Object.fromEntries(
  champions.map((c) => [c.id, c]),
);
export const traitThresholds: Record<string, number[]> = catalog.traits;
export const itemNames: Record<string, string> = {
  ...catalog.items,
  ...Object.fromEntries(registry.items.map((i) => [i.id, i.name])),
};
export const allItems = registry.items;
export type ItemDetail = {
  id: string;
  name: string;
  recipe: string[];
  category: string;
  desc: string;
  stats: string[];
};
const itemDetailsMap = itemDetailsData as Record<
  string,
  { desc: string; stats: string[] }
>;
export const itemById: Record<string, ItemDetail> = Object.fromEntries(
  registry.items.map((item) => [
    item.id,
    {
      ...item,
      desc: itemDetailsMap[item.id]?.desc || "",
      stats: itemDetailsMap[item.id]?.stats || [],
    },
  ]),
);
export const allAugments: Record<
  string,
  { id: string; name: string; icon: boolean; unresolved?: boolean }
> = registry.augments;
export const pivotSnapshot = pivot;
export const allTraits = workspace.traits;
export const traitIcon = (name: string) =>
  `./assets/traits/${allTraits.find((t) => t.name === name)?.id}.png`;
export const initialComps: Comp[] = [
  ...(pivot.comps as unknown as Comp[]),
  ...guides,
];
export const shops = [
  ["DA_18_Alune", "DA_Vi18", "DA_Taric18", "DA_18_MasterYi_AD", "DA_18_Diana"],
  [
    "DA_18_Morgana",
    "DA_18_Hecarim",
    "DA_18_Alistar",
    "DA_18_Alune",
    "DA_18_Alune",
  ],
  [
    "DA_Cinderling18",
    "DA_18_Kennen",
    "DA_18_Varus",
    "DA_18_Rengar",
    "DA_18_Lillia",
  ],
];
export const portrait = (id: string) => "./assets/portraits/" + id + ".png";
export const splash = (id: string) => "./assets/champions/" + id + ".png";
