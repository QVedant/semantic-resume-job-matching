// Interview-round helpers shared by server pages and browser components.

type Round = { round_no: number; result: string | null };

// The current interview round: the first round (in order) that is not PASSED
// yet, which may have no row in application_rounds yet. None if every round is
// passed or one was failed.
export function currentRound<R extends Round>(rounds: R[]): R | undefined {
  const round = rounds.find((r) => r.result !== "PASSED");
  return round && round.result !== "REJECTED" ? round : undefined;
}
