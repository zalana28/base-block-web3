import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import { GAME_CONTRACT_ADDRESS } from "./contract.js";

export const LEADERBOARD_ADDRESS = GAME_CONTRACT_ADDRESS;

export const wagmiConfig = getDefaultConfig({
  appName: "Base Block",
  projectId: "921fd8cd906240df00df6906a1bdcfa4",
  chains: [base],
  ssr: false,
});
