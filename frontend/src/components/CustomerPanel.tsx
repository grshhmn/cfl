import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useEncrypt } from "../hooks";
import { BalanceDisplay } from "./BalanceDisplay";

interface CustomerPanelProps {
  address: string;
  signer: ethers.Signer;
  contractAddress: string;
  isCustomer: boolean;
  transferPoints: (
    to: string,
    encryptedAmount: string,
    inputProof: string
  ) => Promise<boolean>;
  burnPoints: (
    encryptedAmount: string,
    inputProof: string
  ) => Promise<boolean>;
  getBalanceHandle: (address: string) => Promise<string | null>;
  getTotalSupplyHandle: () => Promise<string | null>;
  isLoading: boolean;
  isMerchant: boolean;
}

export function CustomerPanel({
  address,
  signer,
  contractAddress,
  isCustomer,
  transferPoints,
  burnPoints,
  getBalanceHandle,
  getTotalSupplyHandle,
  isLoading,
  isMerchant,
}: CustomerPanelProps) {
  const [recipientAddress, setRecipientAddress] = useState("0x73efd66c49e89ef835641d02a0ab6c924089b960");
  const [transferAmount, setTransferAmount] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { encrypt64, isEncrypting } = useEncrypt();

  const handleTransfer = useCallback(async () => {
    if (!recipientAddress || !transferAmount) {
      setError("Please enter recipient address and amount");
      return;
    }

    if (!ethers.isAddress(recipientAddress)) {
      setError("Invalid recipient address");
      return;
    }

    const pointsAmount = parseInt(transferAmount);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Encrypt the amount
      const encrypted = await encrypt64(
        contractAddress,
        address,
        BigInt(pointsAmount)
      );

      if (!encrypted) {
        setError("Failed to encrypt amount");
        return;
      }

      // Transfer the points
      const result = await transferPoints(
        recipientAddress,
        encrypted.handles[0],
        encrypted.inputProof
      );

      if (result) {
        setSuccess(`Successfully transferred points to ${recipientAddress.slice(0, 10)}...`);
        setTransferAmount("");
        setRecipientAddress("");
      }
    } catch (err) {
      console.error("Transfer failed:", err);
      setError(err instanceof Error ? err.message : "Failed to transfer points");
    }
  }, [recipientAddress, transferAmount, contractAddress, address, encrypt64, transferPoints]);

  const handleBurn = useCallback(async () => {
    if (!burnAmount) {
      setError("Please enter amount to burn");
      return;
    }

    const pointsAmount = parseInt(burnAmount);
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Encrypt the amount
      const encrypted = await encrypt64(
        contractAddress,
        address,
        BigInt(pointsAmount)
      );

      if (!encrypted) {
        setError("Failed to encrypt amount");
        return;
      }

      // Burn the points
      const result = await burnPoints(
        encrypted.handles[0],
        encrypted.inputProof
      );

      if (result) {
        setSuccess(`Successfully burned ${pointsAmount} points`);
        setBurnAmount("");
      }
    } catch (err) {
      console.error("Burn failed:", err);
      setError(err instanceof Error ? err.message : "Failed to burn points");
    }
  }, [burnAmount, contractAddress, address, encrypt64, burnPoints]);

  if (!isCustomer && !isMerchant) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>🔒</span>
          <h3 style={styles.emptyTitle}>No Points Yet</h3>
          <p style={styles.emptyDescription}>
            You don't have any loyalty points yet. Ask the merchant to mint some points to your address!
          </p>
          <div style={styles.addressBox}>
            <span style={styles.addressLabel}>Your address:</span>
            <code style={styles.addressCode}>{address}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.badge}>Customer</div>
      <h2 style={styles.title}>Your Loyalty Points</h2>

      {/* Balance Display */}
      <BalanceDisplay
        address={address}
        signer={signer}
        contractAddress={contractAddress}
        isMerchant={isMerchant}
        getBalanceHandle={getBalanceHandle}
        getTotalSupplyHandle={getTotalSupplyHandle}
      />

      {/* Transfer Points Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Transfer Points</h3>
        <p style={styles.description}>
          Send points to another customer. The transfer amount is encrypted.
        </p>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="0x..."
            style={styles.input}
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Amount</label>
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="50"
            min="1"
            style={styles.input}
          />
        </div>
        <button
          onClick={handleTransfer}
          disabled={isLoading || isEncrypting}
          style={styles.primaryButton}
        >
          {isLoading || isEncrypting ? "Processing..." : "Transfer Points"}
        </button>
      </div>

      {/* Burn Points Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Redeem (Burn) Points</h3>
        <p style={styles.description}>
          Burn points to redeem rewards. This permanently removes points from your balance.
        </p>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Amount to Burn</label>
          <input
            type="number"
            value={burnAmount}
            onChange={(e) => setBurnAmount(e.target.value)}
            placeholder="25"
            min="1"
            style={styles.input}
          />
        </div>
        <button
          onClick={handleBurn}
          disabled={isLoading || isEncrypting}
          style={styles.dangerButton}
        >
          {isLoading || isEncrypting ? "Processing..." : "Burn Points"}
        </button>
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
    border: "1px solid rgba(71, 85, 105, 0.5)",
  },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    color: "#3b82f6",
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
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "6px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "6px",
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
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  dangerButton: {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
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
  emptyState: {
    textAlign: "center" as const,
    padding: "20px 12px",
  },
  emptyIcon: {
    fontSize: "32px",
    display: "block",
    marginBottom: "10px",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "6px",
  },
  emptyDescription: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "16px",
    maxWidth: "300px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  addressBox: {
    display: "inline-flex",
    flexDirection: "column" as const,
    gap: "4px",
    padding: "10px 16px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "6px",
  },
  addressLabel: {
    fontSize: "11px",
    color: "#64748b",
  },
  addressCode: {
    fontSize: "12px",
    color: "#e2e8f0",
    fontFamily: "monospace",
    wordBreak: "break-all" as const,
  },
};
