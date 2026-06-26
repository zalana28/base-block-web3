import { http, createConfig, createStorage } from "wagmi";
import { Attribution } from "ox/erc8021";
import { base } from "./chain.js";
import { baseAccount, injected } from "wagmi/connectors";

import { GAME_CONTRACT_ADDRESS } from "./contract.js";

export const LEADERBOARD_ADDRESS = GAME_CONTRACT_ADDRESS;

export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_rhgm3bxx"] });

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    baseAccount({
      appName: "Base Block",
      appLogoUrl: typeof window !== "undefined" ? window.location.origin + "/favicon.ico" : undefined,
    }),
    injected(),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: false,
  storage: createStorage({ storage: localStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
