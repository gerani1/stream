'use client';

import { AppConfig, UserSession, showConnect, openSignatureRequestPopup } from '@stacks/connect';
import { StacksTestnet } from '@stacks/network';
import { api, setToken } from './api';

const appConfig = new AppConfig(['store_write']);
export const userSession = new UserSession({ appConfig });

export function connectWallet(onFinish: () => void): void {
  showConnect({
    appDetails: { name: 'StackStream Bounty Board', icon: '/icon.png' },
    userSession,
    onFinish,
  });
}

export function currentAddress(): string | null {
  if (!userSession.isUserSignedIn()) return null;
  const data = userSession.loadUserData();
  return data.profile.stxAddress.testnet ?? null;
}

/**
 * Wallet-first sign-in: request a single-use nonce, sign the domain-bound
 * message, exchange the signature for a session token. No passwords anywhere.
 */
export async function signIn(): Promise<void> {
  const address = currentAddress();
  if (!address) throw new Error('Connect a wallet first');

  const { nonce, message } = await api<{ nonce: string; message: string }>('/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });

  await new Promise<void>((resolve, reject) => {
    openSignatureRequestPopup({
      message,
      network: new StacksTestnet(),
      onFinish: async (data) => {
        try {
          const { token } = await api<{ token: string }>('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({
              address,
              nonce,
              message,
              signature: data.signature,
              publicKey: data.publicKey,
            }),
          });
          setToken(token);
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      onCancel: () => reject(new Error('Signature cancelled')),
    });
  });
}

export function signOut(): void {
  setToken(null);
  if (userSession.isUserSignedIn()) userSession.signUserOut();
}
