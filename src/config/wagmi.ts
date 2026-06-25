import { http, createConfig, createStorage } from "wagmi";
import { Attribution } from "ox/erc8021";
import { base } from "./chain.js";
import { baseAccount, injected } from "wagmi/connectors";

export const LEADERBOARD_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ["bc_xxxxxx"] });

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
