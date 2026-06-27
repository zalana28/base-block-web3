import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { Attribution } from "ox/erc8021";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { base } from "./chain.js";
import { GAME_CONTRACT_ADDRESS } from "./contract.js";

export const LEADERBOARD_ADDRESS = GAME_CONTRACT_ADDRESS;

export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_rhgm3bxx"] });

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: "Base Block",
      preference: "smartWalletOnly",
    }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: false,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
