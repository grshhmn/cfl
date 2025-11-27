import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getFheInstance } from "../core/fhevm";

export interface DecryptHandle {
  handle: string;
  contractAddress: string;
}

export function useDecrypt() {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (
      handles: DecryptHandle[],
      signer: ethers.Signer,
      userAddress: string,
      contractAddresses: string[]
    ): Promise<Map<string, bigint>> => {
      const instance = getFheInstance();
      if (!instance) {
        setError("FHEVM not initialized");
        return new Map();
      }

      if (handles.length === 0) {
        return new Map();
      }

      setIsDecrypting(true);
      setError(null);

      try {
        console.log("[useDecrypt] Starting decryption...");
        console.log("[useDecrypt] Handles:", handles);
        console.log("[useDecrypt] User address:", userAddress);
        console.log("[useDecrypt] Contract addresses:", contractAddresses);

        // Generate keypair for decryption
        const keypair = instance.generateKeypair();
        console.log("[useDecrypt] Keypair generated, publicKey length:", keypair.publicKey.length);

        // Create EIP-712 message
        const startTimestamp = Math.floor(Date.now() / 1000);
        const durationDays = 7;
        console.log("[useDecrypt] Timestamp:", startTimestamp, "Duration:", durationDays);

        const eip712Message = instance.createEIP712(
          keypair.publicKey,
          contractAddresses,
          startTimestamp,
          durationDays
        );
        console.log("[useDecrypt] EIP-712 message created:", eip712Message);

        // Sign the message - remove EIP712Domain from types (ethers v6 handles it automatically)
        const { EIP712Domain, ...typesWithoutDomain } = eip712Message.types;
        console.log("[useDecrypt] Types without domain:", typesWithoutDomain);

        const signature = await signer.signTypedData(
          eip712Message.domain,
          typesWithoutDomain,
          eip712Message.message
        );
        console.log("[useDecrypt] Signature obtained:", signature.slice(0, 20) + "...");

        // Decrypt the values
        console.log("[useDecrypt] Calling userDecrypt...");
        const results = await instance.userDecrypt(
          handles,
          keypair.privateKey,
          keypair.publicKey,
          signature,
          contractAddresses,
          userAddress,
          startTimestamp,
          durationDays
        );
        console.log("[useDecrypt] Decryption results:", results);

        // Convert results to Map
        const resultMap = new Map<string, bigint>();
        for (const [handle, value] of Object.entries(results)) {
          resultMap.set(handle, BigInt(value as string | number));
        }
        console.log("[useDecrypt] Final result map:", resultMap);

        return resultMap;
      } catch (err) {
        console.error("Decryption failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        return new Map();
      } finally {
        setIsDecrypting(false);
      }
    },
    []
  );

  return { decrypt, isDecrypting, error };
}
