import { useState, useCallback } from "react";
import { getFheInstance } from "../core/fhevm";

export interface EncryptedInput {
  handles: Uint8Array[];
  inputProof: Uint8Array;
}

export function useEncrypt() {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(
    async (
      contractAddress: string,
      userAddress: string,
      value: bigint
    ): Promise<EncryptedInput | null> => {
      console.log("[useEncrypt] Starting encryption...");
      console.log("[useEncrypt] Contract:", contractAddress);
      console.log("[useEncrypt] User:", userAddress);
      console.log("[useEncrypt] Value:", value.toString());

      const instance = getFheInstance();
      if (!instance) {
        console.error("[useEncrypt] FHEVM not initialized");
        setError("FHEVM not initialized");
        return null;
      }

      setIsEncrypting(true);
      setError(null);

      try {
        console.log("[useEncrypt] Creating encrypted input...");
        const input = instance.createEncryptedInput(contractAddress, userAddress);
        input.add64(value);
        console.log("[useEncrypt] Encrypting...");
        const encrypted = await input.encrypt();
        console.log("[useEncrypt] Encryption complete:", encrypted);
        console.log("[useEncrypt] Handles:", encrypted.handles);
        console.log("[useEncrypt] Input proof length:", encrypted.inputProof?.length);
        return encrypted as EncryptedInput;
      } catch (err) {
        console.error("[useEncrypt] Failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setIsEncrypting(false);
      }
    },
    []
  );

  return { encrypt64, isEncrypting, error };
}
