import { useCallback, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '../config/contract.js';
import { DATA_SUFFIX } from '../config/wagmi.js';
import { base } from '../config/chain.js';

type GameMode = 0 | 1; // 0 = Classic, 1 = Arcade
type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

// State final-score submit DIPISAH dari live submit (useGameContract). Tanpa
// pemisahan ini, transaksi submitScore yang sukses saat game berjalan membuat
// status sukses "bocor" ke tombol final score di layar Game Over — tombol
// terlihat sudah terkirim padahal skor final belum pernah dikirim.
export function useFinalScoreSubmit() {
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

  const submitScore = useCallback(
    (mode: GameMode, score: number, level: number) => {
      // Cegah double submit untuk skor final yang sama: sekali sukses, tombol
      // terkunci sampai reset (PLAY AGAIN / game baru / exit / ganti wallet).
      if (isSuccess) return;
      if (isPending || isConfirming) return;
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
      } catch {
        // writeContract throws synchronously for invalid args
      }
    },
    [isSuccess, isPending, isConfirming, reset, writeContract],
  );

  return { submitScore, status, error, reset } as const;
}
