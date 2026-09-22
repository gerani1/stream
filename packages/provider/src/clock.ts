/** Injectable time, so streams can be fast-forwarded in tests and demos. */
export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Math.floor(Date.now() / 1000) };

export class ManualClock implements Clock {
  constructor(private seconds: number) {}
  now(): number {
    return this.seconds;
  }
  advance(seconds: number): void {
    this.seconds += seconds;
  }
  set(seconds: number): void {
    this.seconds = seconds;
  }
}
