"use client";

import { useSyncExternalStore } from "react";
import { NETWORKS, getNetworkId, type NetworkConfig } from "./config";

// Switching networks reloads the page, so the value never changes underneath a
// mounted tree and there is nothing to subscribe to.
const subscribe = () => () => {};
const getSnapshot = () => getNetworkId();
// The server can't read localStorage, so it renders the default and React
// reconciles after hydration instead of mismatching.
const getServerSnapshot = () => "testnet" as const;

/** The active network, for rendering. */
export function useNetwork(): NetworkConfig {
  return NETWORKS[
    useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  ];
}
