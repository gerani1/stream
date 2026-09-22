import type { TaskStatus, ParticipantStatus } from './types.js';

/**
 * Allowed task transitions. Anything not listed here is rejected by
 * `assertTaskTransition`, so an invalid state change fails loudly at the domain
 * boundary rather than silently corrupting a funded task.
 */
const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  DRAFT: ['FUNDING_PENDING'],
  // A deposit that never confirms returns the task to DRAFT.
  FUNDING_PENDING: ['FUNDED', 'DRAFT'],
  FUNDED: ['OPEN', 'CANCELLED'],
  OPEN: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const PARTICIPANT_TRANSITIONS: Record<ParticipantStatus, readonly ParticipantStatus[]> = {
  applied: ['selected'],
  selected: ['active'],
  // A flag does not pause the stream; it is a warning that the next review is
  // decisive. See README > Two-strike drop mechanism.
  active: ['flagged', 'completed', 'dropped'],
  flagged: ['active', 'dropped', 'completed'],
  dropped: [],
  completed: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export function canTransitionParticipant(from: ParticipantStatus, to: ParticipantStatus): boolean {
  return PARTICIPANT_TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly entity: 'task' | 'participant',
    readonly from: string,
    readonly to: string,
  ) {
    super(`Invalid ${entity} transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) throw new InvalidTransitionError('task', from, to);
}

export function assertParticipantTransition(from: ParticipantStatus, to: ParticipantStatus): void {
  if (!canTransitionParticipant(from, to)) {
    throw new InvalidTransitionError('participant', from, to);
  }
}

export const TERMINAL_TASK_STATUSES: readonly TaskStatus[] = ['COMPLETED', 'CANCELLED'];
export const TERMINAL_PARTICIPANT_STATUSES: readonly ParticipantStatus[] = ['dropped', 'completed'];

export function isTaskTerminal(s: TaskStatus): boolean {
  return TERMINAL_TASK_STATUSES.includes(s);
}

export function isParticipantTerminal(s: ParticipantStatus): boolean {
  return TERMINAL_PARTICIPANT_STATUSES.includes(s);
}
