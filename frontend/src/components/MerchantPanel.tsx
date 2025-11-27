import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useEncrypt, useDecrypt } from "../hooks";

interface MerchantPanelProps {
  address: string;
  signer: ethers.Signer;
  contractAddress: string;
  mintPoints: (
    customer: string,
    encryptedAmount: string,
    inputProof: string
  ) => Promise<boolean>;
  getBalanceHandle: (address: string) => Promise<string | null>;
  isLoading: boolean;
}

export function MerchantPanel({
  address,
  signer,
  contractAddress,
  mintPoints,
  getBalanceHandle,
  isLoading,
}: MerchantPanelProps) {
  const [customerAddress, setCustomerAddress] = useState("0x73efd66c49e89ef835641d02a0ab6c924089b960");
  const [amount, setAmount] = useState("");
  const [lookupAddress, setLookupAddress] = useState("0x73efd66c49e89ef835641d02a0ab6c924089b960");
  const [customerBalance, setCustomerBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { encrypt64, isEncrypting } = useEncrypt();
  const { decrypt, isDecrypting } = useDecrypt();

  const handleMintPoints = useCallback(async () => {
    console.log("[MerchantPanel] Mint button clicked");
    console.log("[MerchantPanel] Customer address:", customerAddress);
    console.log("[MerchantPanel] Amount:", amount);

    if (!customerAddress || !amount) {
      setError("Please enter customer address and amount");
      return;
    }

    if (!ethers.isAddress(customerAddress)) {
      setError("Invalid customer address");
      return;
    }

    const pointsAmount = parseInt(amount);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      console.log("[MerchantPanel] Starting encryption for amount:", pointsAmount);
      // Encrypt the amount
      const encrypted = await encrypt64(
        contractAddress,
        address,
        BigInt(pointsAmount)
      );

      if (!encrypted) {
        console.error("[MerchantPanel] Encryption returned null");
        setError("Failed to encrypt amount");
        return;
      }

      console.log("[MerchantPanel] Encryption successful, calling mintPoints...");
      console.log("[MerchantPanel] Handle:", encrypted.handles[0]);

      // Mint the points
      const result = await mintPoints(
        customerAddress,
        encrypted.handles[0],
        encrypted.inputProof
      );

      console.log("[MerchantPanel] Mint result:", result);

      if (result) {
        setSuccess(`Successfully minted ${pointsAmount} points to ${customerAddress.slice(0, 10)}...`);
        setAmount("");
        setCustomerAddress("");
      }
    } catch (err) {
      console.error("[MerchantPanel] Mint failed:", err);
      setError(err instanceof Error ? err.message : "Failed to mint points");
    }
  }, [customerAddress, amount, contractAddress, address, encrypt64, mintPoints]);

  const handleLookupBalance = useCallback(async () => {
    if (!lookupAddress) {
      setError("Please enter an address to lookup");
      return;
    }

    if (!ethers.isAddress(lookupAddress)) {
      setError("Invalid address");
      return;
    }

    setError(null);
    setCustomerBalance(null);

    try {
      const balanceHandle = await getBalanceHandle(lookupAddress);

      if (!balanceHandle || balanceHandle === "0") {
        setCustomerBalance("0");
        return;
      }

      const handles = [{ handle: balanceHandle, contractAddress }];
      const results = await decrypt(handles, signer, address, [contractAddress]);

      if (results.size > 0) {
        const decrypted = results.get(balanceHandle);
        setCustomerBalance(decrypted?.toString() || "0");
      } else {
        setError("Failed to decrypt balance - you may not have permission");
      }
    } catch (err) {
      console.error("Lookup failed:", err);
      setError(err instanceof Error ? err.message : "Failed to lookup balance");
    }
  }, [lookupAddress, contractAddress, address, signer, getBalanceHandle, decrypt]);

  return (
    <div style={styles.container}>
      <div style={styles.badge}>Merchant</div>
      <h2 style={styles.title}>Merchant Dashboard</h2>

      {/* Mint Points Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Mint Points to Customer</h3>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Customer Address</label>
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="0x..."
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            min="1"
            style={styles.input}
          />
        </div>
        <button
          onClick={handleMintPoints}
          disabled={isLoading || isEncrypting}
          style={styles.primaryButton}
        >
          {isLoading || isEncrypting ? "Processing..." : "Mint Points"}
        </button>
      </div>

      {/* Lookup Customer Balance Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Lookup Customer Balance</h3>
        <p style={styles.description}>
          As the merchant, you can view any customer's balance.
        </p>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Customer Address</label>
          <input
            type="text"
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x..."
            style={styles.input}
          />
        </div>
        <button
          onClick={handleLookupBalance}
          disabled={isDecrypting}
          style={styles.secondaryButton}
        >
          {isDecrypting ? "Decrypting..." : "Lookup Balance"}
        </button>

        {customerBalance !== null && (
          <div style={styles.resultBox}>
            <span style={styles.resultLabel}>Balance:</span>
            <span style={styles.resultValue}>{customerBalance} points</span>
          </div>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: "16px",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: "10px",
    border: "1px solid rgba(234, 179, 8, 0.3)",
  },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    backgroundColor: "rgba(234, 179, 8, 0.2)",
    color: "#eab308",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "12px",
    color: "#f1f5f9",
  },
  section: {
    marginBottom: "12px",
    padding: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "6px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#e2e8f0",
  },
  description: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "10px",
  },
  inputGroup: {
    marginBottom: "10px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "500",
    color: "#94a3b8",
    marginBottom: "4px",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#e2e8f0",
    fontSize: "12px",
    outline: "none",
  },
  primaryButton: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#eab308",
    color: "#1a1a2e",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  secondaryButton: {
    width: "100%",
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#3b82f6",
    border: "1px solid #3b82f6",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  resultBox: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: "6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultLabel: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  resultValue: {
    color: "#4ade80",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  error: {
    color: "#ef4444",
    fontSize: "12px",
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "6px",
  },
  success: {
    color: "#4ade80",
    fontSize: "12px",
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderRadius: "6px",
  },
};
