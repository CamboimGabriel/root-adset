import { describe, expect, it } from "vitest";
import {
  createInitialRating,
  DISPLAY_BASE,
  INITIAL_MU,
  INITIAL_SIGMA,
  rateMatch,
  regressTowardMean,
  toDisplayConservative,
  toDisplayRating,
} from "./rating";

describe("OpenSkill rating", () => {
  it("starts every player at the 1500 display baseline", () => {
    const skill = createInitialRating();
    expect(skill).toEqual({ mu: INITIAL_MU, sigma: INITIAL_SIGMA });
    expect(toDisplayRating(skill.mu)).toBe(DISPLAY_BASE);
    expect(toDisplayConservative(skill)).toBeLessThan(DISPLAY_BASE);
  });

  it("raises the winner and lowers every loser", () => {
    const [winner, ...losers] = rateMatch(Array.from({ length: 4 }, createInitialRating), [true, false, false, false]);
    expect(winner.mu).toBeGreaterThan(INITIAL_MU);
    for (const loser of losers) expect(loser.mu).toBeLessThan(INITIAL_MU);
  });

  it("treats all losers as tied instead of inventing 2nd/3rd/4th places", () => {
    const result = rateMatch(Array.from({ length: 4 }, createInitialRating), [false, false, true, false]);
    const losers = result.filter((_, index) => index !== 2);
    expect(losers[0]).toEqual(losers[1]);
    expect(losers[1]).toEqual(losers[2]);
  });

  it("gives a bigger gain for beating stronger opponents", () => {
    const strong = { mu: 32, sigma: 4 };
    const weak = { mu: 18, sigma: 4 };
    const [againstStrong] = rateMatch([createInitialRating(), strong, strong], [true, false, false]);
    const [againstWeak] = rateMatch([createInitialRating(), weak, weak], [true, false, false]);
    expect(againstStrong.mu - INITIAL_MU).toBeGreaterThan(againstWeak.mu - INITIAL_MU);
  });

  it("rewards every member of a winning coalition", () => {
    const [vagabond, partner, loserA, loserB] = rateMatch(Array.from({ length: 4 }, createInitialRating), [true, true, false, false]);
    expect(vagabond.mu).toBeGreaterThan(INITIAL_MU);
    expect(partner).toEqual(vagabond);
    expect(loserA.mu).toBeLessThan(INITIAL_MU);
    expect(loserB).toEqual(loserA);
  });

  it("reduces uncertainty as matches accumulate", () => {
    let skills = Array.from({ length: 3 }, createInitialRating);
    const sigmas = [skills[0].sigma];
    for (let match = 0; match < 6; match++) {
      skills = rateMatch(skills, [match % 3 === 0, match % 3 === 1, match % 3 === 2]);
      sigmas.push(skills[0].sigma);
    }
    for (let index = 1; index < sigmas.length; index++) expect(sigmas[index]).toBeLessThan(sigmas[index - 1]);
  });

  it("regresses partially toward the mean between seasons", () => {
    const regressed = regressTowardMean({ mu: 33, sigma: 3 }, 0.75);
    expect(regressed.mu).toBeCloseTo(31);
    expect(regressed.sigma).toBeGreaterThan(3);
    expect(regressed.sigma).toBeLessThanOrEqual(INITIAL_SIGMA);
    expect(regressTowardMean({ mu: 33, sigma: 3 }, 1)).toEqual({ mu: 33, sigma: 3 });
  });
});
