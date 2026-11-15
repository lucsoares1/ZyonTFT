import type { Comp, Champion } from "./data";
export type LevelContext = {
  level: number;
  gold: number;
  hp: number;
  strength: "stable" | "weak";
  contested: boolean;
  copies: Record<string, number>;
};
export type LevelTeam = {
  ids: string[];
  carry: string | null;
  temporary: string[];
  slots: number;
};
export type LevelStrategy = {
  ids: string[];
  carry: string;
  targets: string[];
  allTargets: string[];
  cost: number;
  targetLevel: number;
  damage: string[];
  tank: string[];
  reroll: boolean;
};
export type LevelPlan = {
  context: LevelContext;
  strategy: LevelStrategy;
  teams: Record<number, LevelTeam>;
  team: LevelTeam;
  entering: string[];
  leaving: string[];
  retained: string[];
  search: string[];
  reserve: string[];
  later: string[];
  targets: string[];
  equipment: Record<string, string[]>;
  transfers: {
    target: string;
    holder: string | null;
    items: string[];
    temporary: boolean;
  }[];
  decision: { kind: string; title: string; text: string };
  priorities: { id: string; goal: number; reason: string }[];
  budget: { purchaseReserve: number; floor: number; rolls: number };
  instruction: string;
  odds: number[];
  notes: string[];
};
export const DEFAULT_LEVEL_CONTEXT: LevelContext;
export const shopRules: {
  source: string;
  patch: string;
  checkedAt: string;
  odds: Record<number, number[]>;
  units: Record<
    string,
    { frontline: boolean; slots: number; family: string; damage: string }
  >;
};
export function normalizeLevelContext(
  value?: Partial<LevelContext>,
): LevelContext;
export function unitSlots(id: string): number;
export function teamSlots(ids: string[]): number;
export function costOdds(level: number, cost: number): number;
export function strategyFor(
  comp: Comp,
  catalog: Record<string, Champion>,
  context?: Partial<LevelContext>,
): LevelStrategy;
export function teamAtLevel(
  comp: Comp,
  catalog: Record<string, Champion>,
  level: number,
  context?: Partial<LevelContext>,
  previous?: string[],
): LevelTeam;
export function planForLevel(
  comp: Comp,
  catalog: Record<string, Champion>,
  context?: Partial<LevelContext>,
): LevelPlan;
