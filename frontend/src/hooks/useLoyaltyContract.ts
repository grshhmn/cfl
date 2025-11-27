import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

const CONTRACT_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function merchant() view returns (address)",
  "function isCustomer(address) view returns (bool)",
  "function getBalance(address) view returns (uint256)",
  "function getTotalSupply() view returns (uint256)",
  "function mintPoints(address customer, bytes32 encryptedAmount, bytes calldata inputProof)",
  "function transferPoints(address to, bytes32 encryptedAmount, bytes calldata inputProof)",
  "function burnPoints(bytes32 encryptedAmount, bytes calldata inputProof)",
  "function transferMerchant(address newMerchant)",
  "function grantMerchantAccess(address customer)",
  "event PointsMinted(address indexed customer, address indexed merchant)",
  "event PointsTransferred(address indexed from, address indexed to)",
];

export interface ContractInfo {
  name: string;
  symbol: string;
  merchant: string;
}

export function useLoyaltyContract(
  signer: ethers.Signer | null,
  provider: ethers.BrowserProvider | null
) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize contract
  useEffect(() => {
    if (!CONTRACT_ADDRESS) {
      setError("Contract address not configured. Set VITE_CONTRACT_ADDRESS in .env");
      return;
    }

    if (signer) {
      const loyaltyContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );
      setContract(loyaltyContract);
    } else if (provider) {
      const loyaltyContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );
      setContract(loyaltyContract);
    }
  }, [signer, provider]);

  // Fetch contract info and user role
  const fetchContractInfo = useCallback(
    async (userAddress: string) => {
      if (!contract) return;

      setIsLoading(true);
      setError(null);

      try {
        const [name, symbol, merchant, customerStatus] = await Promise.all([
          contract.name() as Promise<string>,
          contract.symbol() as Promise<string>,
          contract.merchant() as Promise<string>,
          contract.isCustomer(userAddress) as Promise<boolean>,
        ]);

        setContractInfo({ name, symbol, merchant });
        setIsMerchant(merchant.toLowerCase() === userAddress.toLowerCase());
        setIsCustomer(customerStatus);
      } catch (err) {
        console.error("Failed to fetch contract info:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch contract info");
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  // Get encrypted balance handle
  const getBalanceHandle = useCallback(
    async (customerAddress: string): Promise<string | null> => {
      if (!contract) return null;

      try {
        console.log("[getBalanceHandle] Fetching balance for:", customerAddress);
        const handle = await contract.getBalance(customerAddress);
        console.log("[getBalanceHandle] Raw handle from contract:", handle.toString());
        // Convert to hex string with 0x prefix, padded to 64 chars (32 bytes)
        const hexHandle = "0x" + BigInt(handle).toString(16).padStart(64, "0");
        console.log("[getBalanceHandle] Converted hex handle:", hexHandle);
        return hexHandle;
      } catch (err) {
        console.error("[getBalanceHandle] Failed:", err);
        return null;
      }
    },
    [contract]
  );

  // Get encrypted total supply handle
  const getTotalSupplyHandle = useCallback(async (): Promise<string | null> => {
    if (!contract) return null;

    try {
      console.log("[getTotalSupplyHandle] Fetching total supply...");
      const handle = await contract.getTotalSupply();
      console.log("[getTotalSupplyHandle] Raw handle from contract:", handle.toString());
      // Convert to hex string with 0x prefix, padded to 64 chars (32 bytes)
      const hexHandle = "0x" + BigInt(handle).toString(16).padStart(64, "0");
      console.log("[getTotalSupplyHandle] Converted hex handle:", hexHandle);
      return hexHandle;
    } catch (err) {
      console.error("[getTotalSupplyHandle] Failed:", err);
      return null;
    }
  }, [contract]);

  // Mint points (merchant only)
  const mintPoints = useCallback(
    async (
      customerAddress: string,
      encryptedAmount: string,
      inputProof: string
    ): Promise<boolean> => {
      console.log("[mintPoints] Starting mint...");
      console.log("[mintPoints] Customer:", customerAddress);
      console.log("[mintPoints] Encrypted amount:", encryptedAmount);
      console.log("[mintPoints] Input proof length:", inputProof.length);

      if (!contract) {
        console.error("[mintPoints] Contract not initialized");
        setError("Contract not initialized");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("[mintPoints] Sending transaction...");
        const tx = await contract.mintPoints(
          customerAddress,
          encryptedAmount,
          inputProof
        );
        console.log("[mintPoints] Transaction sent:", tx.hash);
        console.log("[mintPoints] Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("[mintPoints] Transaction confirmed:", receipt);
        return true;
      } catch (err) {
        console.error("[mintPoints] Failed:", err);
        setError(err instanceof Error ? err.message : "Failed to mint points");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  // Transfer points
  const transferPoints = useCallback(
    async (
      toAddress: string,
      encryptedAmount: string,
      inputProof: string
    ): Promise<boolean> => {
      if (!contract) {
        setError("Contract not initialized");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const tx = await contract.transferPoints(
          toAddress,
          encryptedAmount,
          inputProof
        );
        await tx.wait();
        return true;
      } catch (err) {
        console.error("Failed to transfer points:", err);
        setError(err instanceof Error ? err.message : "Failed to transfer points");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  // Burn points
  const burnPoints = useCallback(
    async (encryptedAmount: string, inputProof: string): Promise<boolean> => {
      if (!contract) {
        setError("Contract not initialized");
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const tx = await contract.burnPoints(encryptedAmount, inputProof);
        await tx.wait();
        return true;
      } catch (err) {
        console.error("Failed to burn points:", err);
        setError(err instanceof Error ? err.message : "Failed to burn points");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [contract]
  );

  return {
    contract,
    contractAddress: CONTRACT_ADDRESS,
    contractInfo,
    isMerchant,
    isCustomer,
    isLoading,
    error,
    fetchContractInfo,
    getBalanceHandle,
    getTotalSupplyHandle,
    mintPoints,
    transferPoints,
    burnPoints,
  };
}
