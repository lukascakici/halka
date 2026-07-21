"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  connectWallet,
  restoreAddress,
  getActiveNetworkPassphrase,
  disconnectWallet,
  signXdr,
  WalletError,
} from "@/lib/wallet";
import { getNetwork } from "@/lib/config";

type Status = "disconnected" | "connecting" | "connected";

interface WalletState {
  address: string | null;
  status: Status;
  networkPassphrase: string | null;
  isWrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signXdr: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refreshNetwork = useCallback(async () => {
    setNetworkPassphrase(await getActiveNetworkPassphrase());
  }, []);

  // Restore a previously connected wallet (the kit persists its own state).
  useEffect(() => {
    (async () => {
      const restored = await restoreAddress();
      if (restored) {
        setAddress(restored);
        setStatus("connected");
        await refreshNetwork();
      }
    })();
  }, [refreshNetwork]);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const addr = await connectWallet();
      setAddress(addr);
      setStatus("connected");
      await refreshNetwork();
    } catch (e) {
      setStatus("disconnected");
      setAddress(null);
      const message =
        e instanceof WalletError ? e.message : "Could not connect to wallet.";
      // A cancelled modal is not a real error worth shouting about.
      setError(e instanceof WalletError && e.kind === "rejected" ? null : message);
      throw e;
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    setAddress(null);
    setStatus("disconnected");
    setNetworkPassphrase(null);
    setError(null);
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      if (!address) throw new WalletError("unknown", "Wallet not connected.");
      return signXdr(xdr, address);
    },
    [address],
  );

  const isWrongNetwork =
    status === "connected" &&
    networkPassphrase !== null &&
    networkPassphrase !== getNetwork().passphrase;

  return (
    <WalletContext.Provider
      value={{
        address,
        status,
        networkPassphrase,
        isWrongNetwork,
        error,
        connect,
        disconnect,
        signXdr: sign,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
