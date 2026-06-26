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
  signXdr,
  WalletError,
} from "@/lib/wallet";
import { NETWORK } from "@/lib/config";

type Status = "disconnected" | "connecting" | "connected";

interface WalletState {
  address: string | null;
  status: Status;
  /** Passphrase Freighter is pointed at; null until known. */
  networkPassphrase: string | null;
  isWrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signXdr: (xdr: string) => Promise<string>;
}

const STORAGE_KEY = "halka:connected";

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refreshNetwork = useCallback(async () => {
    const passphrase = await getActiveNetworkPassphrase();
    setNetworkPassphrase(passphrase);
  }, []);

  // Silent restore if the user connected before in this browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) !== "1") return;
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
      window.localStorage.setItem(STORAGE_KEY, "1");
      await refreshNetwork();
    } catch (e) {
      setStatus("disconnected");
      setAddress(null);
      const message =
        e instanceof WalletError ? e.message : "Could not connect to wallet.";
      setError(message);
      throw e;
    }
  }, [refreshNetwork]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setStatus("disconnected");
    setNetworkPassphrase(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
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
    networkPassphrase !== NETWORK.passphrase;

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
