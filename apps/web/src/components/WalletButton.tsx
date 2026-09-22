'use client';

import { useEffect, useState } from 'react';
import { connectWallet, currentAddress, signIn, signOut } from '@/lib/wallet';
import { getToken } from '@/lib/api';

export function WalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAddress(currentAddress());
    setAuthed(Boolean(getToken()));
  }, []);

  if (!address) {
    return (
      <button
        onClick={() => connectWallet(() => setAddress(currentAddress()))}
        className="btn-ghost btn-sm"
      >
        Connect wallet
      </button>
    );
  }

  if (!authed) {
    return (
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signIn();
            setAuthed(true);
          } finally {
            setBusy(false);
          }
        }}
        className="btn-primary btn-sm"
      >
        {busy ? 'Check your wallet…' : 'Sign in'}
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        signOut();
        setAddress(null);
        setAuthed(false);
      }}
      className="btn-ghost btn-sm font-mono"
      title={`${address} — sign out`}
    >
      {address.slice(0, 5)}…{address.slice(-4)}
    </button>
  );
}
