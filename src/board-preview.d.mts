import type {Comp, Champion} from './data';
import type {LevelContext, LevelPlan} from './level-planner.mjs';
export function plannedBoard(comp: Comp, catalog: Record<string, Champion>, plan: LevelPlan, copies?: Record<string, number>): Comp;
export function publishedBoard(comp: Comp, catalog: Record<string, Champion>, options: {level: number; units: string[]; swaps?: {championId: string; replaces: string}[]; context?: Partial<LevelContext>}): Comp;
