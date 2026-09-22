export type ReviewCadence = 'weekly' | 'biweekly' | 'on_submission';

const CADENCE_DAYS: Record<Exclude<ReviewCadence, 'on_submission'>, number> = {
  weekly: 7,
  biweekly: 14,
};

export const MIN_USEFUL_REVIEW_CYCLES = 3;

export interface CadenceAssessment {
  cycles: number;
  /** True when two-strike cannot actually run to a drop before the program ends. */
  twoStrikeIsDecorative: boolean;
  warning: string | null;
  suggestedCadence: ReviewCadence | null;
}

/**
 * Funder-set duration collides with a fixed cadence on short programs: with
 * biweekly reviews a one-month cohort has only two review points, so a
 * participant flagged at the first review cannot be dropped before the program
 * ends. The board warns the funder at configure time.
 *
 * See README > Two-strike drop mechanism, "Watch the cadence on short programs".
 */
export function assessCadence(durationSeconds: number, cadence: ReviewCadence): CadenceAssessment {
  if (cadence === 'on_submission') {
    return { cycles: 1, twoStrikeIsDecorative: false, warning: null, suggestedCadence: null };
  }

  const days = durationSeconds / 86_400;
  const cycles = Math.floor(days / CADENCE_DAYS[cadence]);
  // Flag at cycle 1, decide at cycle 2, and at least one cycle of real runway
  // after that for the drop to mean anything.
  const decorative = cycles < MIN_USEFUL_REVIEW_CYCLES;

  if (!decorative) {
    return { cycles, twoStrikeIsDecorative: false, warning: null, suggestedCadence: null };
  }

  const suggested: ReviewCadence | null = cadence === 'biweekly' ? 'weekly' : null;
  return {
    cycles,
    twoStrikeIsDecorative: true,
    warning:
      `A ${Math.round(days)}-day program on a ${cadence} cadence has only ${cycles} review ` +
      `cycle(s). A participant flagged at the first review cannot be dropped before the ` +
      `program ends, so the two-strike mechanism is effectively advisory.` +
      (suggested ? ` Consider a ${suggested} cadence.` : ''),
    suggestedCadence: suggested,
  };
}
