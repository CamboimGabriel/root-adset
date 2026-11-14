import { rate, rating } from "openskill";
import type { SkillRating } from "./types";

export const INITIAL_MU = 25;
export const INITIAL_SIGMA = INITIAL_MU / 3;
export const CONSERVATIVE_Z = 3;
export const DISPLAY_BASE = 1500;
export const DISPLAY_SCALE = 40;
export const DEFAULT_CARRY_OVER = 0.75;
export const DEFAULT_MIN_MATCHES = 5;

const WINNER_RANK = 1;
const LOSER_RANK = 2;

export function createInitialRating(): SkillRating {
  return rating({ mu: INITIAL_MU, sigma: INITIAL_SIGMA });
}

export function toDisplayRating(mu: number): number {
  return DISPLAY_BASE + (mu - INITIAL_MU) * DISPLAY_SCALE;
}

export function toDisplayUncertainty(sigma: number): number {
  return sigma * DISPLAY_SCALE;
}

export function getConservativeSkill({ mu, sigma }: SkillRating): number {
  return mu - CONSERVATIVE_Z * sigma;
}

export function toDisplayConservative(skill: SkillRating): number {
  return toDisplayRating(getConservativeSkill(skill));
}

export function rateMatch(ratings: SkillRating[], winners: boolean[]): SkillRating[] {
  const teams = ratings.map((skill) => [skill]);
  const rank = winners.map((isWinner) => (isWinner ? WINNER_RANK : LOSER_RANK));
  return rate(teams, { rank }).map(([updated]) => ({ mu: updated.mu, sigma: updated.sigma }));
}

export function regressTowardMean({ mu, sigma }: SkillRating, carryOver: number): SkillRating {
  const inflation = INITIAL_SIGMA * (1 - carryOver);
  return {
    mu: INITIAL_MU + (mu - INITIAL_MU) * carryOver,
    sigma: Math.min(INITIAL_SIGMA, Math.sqrt(sigma ** 2 + inflation ** 2)),
  };
}
