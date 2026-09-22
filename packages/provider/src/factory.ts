import { type Clock, systemClock } from './clock.js';
import { MockStreamProvider } from './mock.js';
import { StackStreamProvider } from './stackstream.js';
import type { StreamProvider } from './types.js';

/**
 * Composition root for the StackStream seam. Swapping the mock for the real
 * adapter is this one switch and nothing else.
 */
export function createStreamProvider(
  env: Record<string, string | undefined>,
  clock: Clock = systemClock,
): StreamProvider {
  const kind = env.STREAM_PROVIDER ?? 'mock';

  if (kind === 'mock') return new MockStreamProvider(clock);

  if (kind === 'stackstream') {
    const apiUrl = env.STACKSTREAM_API_URL;
    const apiKey = env.STACKSTREAM_API_KEY;
    const contractAddress = env.STACKSTREAM_CONTRACT_ADDRESS;
    if (!apiUrl || !apiKey || !contractAddress) {
      throw new Error(
        'STREAM_PROVIDER=stackstream requires STACKSTREAM_API_URL, STACKSTREAM_API_KEY and STACKSTREAM_CONTRACT_ADDRESS',
      );
    }
    return new StackStreamProvider({ apiUrl, apiKey, contractAddress });
  }

  throw new Error(`Unknown STREAM_PROVIDER: ${kind}`);
}
