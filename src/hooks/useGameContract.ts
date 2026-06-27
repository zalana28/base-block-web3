/* eslint-disable no-console */
import { useCallback, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../config/contract.js';
import { DATA_SUFFIX } from '../config/wagmi.js';
import { base } from '../config/chain.js';

type GameMode = 0 | 1; // 0 = Classic, 1 = Arcade
type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

export function useGameContract() {
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: base.id,
  });

  const status: TxStatus = useMemo(() => {
    if (writeError || receiptError) return 'error';
    if (isPending) return 'pending';
    if (isConfirming && hash) return 'confirming';
    if (isSuccess) return 'success';
    return 'idle';
  }, [writeError, receiptError, isPending, isConfirming, isSuccess, hash]);

  const error = useMemo(() => {
    const err = writeError || receiptError;
    if (!err) return null;
    const message =
      'shortMessage' in err && typeof err.shortMessage === 'string'
        ? err.shortMessage
        : err.message || 'Transaction failed';
    return { message };
  }, [writeError, receiptError]);

  const startGame = useCallback(
    (mode: GameMode) => {
      console.log('[Base Block] startGame called:', { mode, contractAddress: GAME_CONTRACT_ADDRESS });
      reset();
      try {
        writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'startGame',
          args: [mode],
          chainId: base.id,
          dataSuffix: DATA_SUFFIX,
        });
        console.log('[Base Block] writeContract initiated for startGame');
      } catch (err) {
        console.error('[Base Block] startGame error:', err);
      }
    },
    [writeContract, reset]
  );

  const submitScore = useCallback(
    (mode: GameMode, score: number, level: number = 0) => {
      console.log('[Base Block] submitScore called:', { mode, score, level, contractAddress: GAME_CONTRACT_ADDRESS });
      reset();
      try {
        writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'submitScore',
          args: [mode, BigInt(score), BigInt(level)],
          chainId: base.id,
          dataSuffix: DATA_SUFFIX,
        });
        console.log('[Base Block] writeContract initiated for submitScore');
      } catch (err) {
        console.error('[Base Block] submitScore error:', err);
      }
    },
    [writeContract, reset]
  );

  return {
    startGame,
    submitScore,
    status,
    hash,
    error,
    reset,
  };
}
