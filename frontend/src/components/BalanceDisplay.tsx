import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useDecrypt } from "../hooks";

interface BalanceDisplayProps {
  address: string;
  signer: ethers.Signer | null;
  contractAddress: string;
  isMerchant: boolean;
  getBalanceHandle: (address: string) => Promise<string | null>;
  getTotalSupplyHandle: () => Promise<string | null>;
}

export function BalanceDisplay({
  address,
  signer,
  contractAddress,
  isMerchant,
  getBalanceHandle,
  getTotalSupplyHandle,
}: BalanceDisplayProps) {
  const [balance, setBalance] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { decrypt, isDecrypting } = useDecrypt();

  const revealBalance = useCallback(async () => {
    if (!signer || !address) return;

    setIsRevealing(true);
    setError(null);

    try {
      // Get the encrypted balance handle
      const balanceHandle = await getBalanceHandle(address);

      if (!balanceHandle || balanceHandle === "0") {
        setBalance("0");
        setIsRevealing(false);
        return;
      }

      // Decrypt the balance
      const handles = [{ handle: balanceHandle, contractAddress }];
      const results = await decrypt(handles, signer, address, [contractAddress]);

      if (results.size > 0) {
        const decryptedBalance = results.get(balanceHandle);
        setBalance(decryptedBalance?.toString() || "0");
      } else {
        setError("Failed to decrypt balance");
      }
    } catch (err) {
      console.error("Failed to reveal balance:", err);
      setError(err instanceof Error ? err.message : "Failed to reveal balance");
    } finally {
      setIsRevealing(false);
    }
  }, [signer, address, contractAddress, getBalanceHandle, decrypt]);

  const revealTotalSupply = useCallback(async () => {
    if (!signer || !address || !isMerchant) return;

    setIsRevealing(true);
    setError(null);

    try {
      const supplyHandle = await getTotalSupplyHandle();

      if (!supplyHandle || supplyHandle === "0") {
        setTotalSupply("0");
        setIsRevealing(false);
        return;
      }

      const handles = [{ handle: supplyHandle, contractAddress }];
      const results = await decrypt(handles, signer, address, [contractAddress]);

      if (results.size > 0) {
        const decryptedSupply = results.get(supplyHandle);
        setTotalSupply(decryptedSupply?.toString() || "0");
      } else {
        setError("Failed to decrypt total supply");
      }
    } catch (err) {
      console.error("Failed to reveal total supply:", err);
      setError(err instanceof Error ? err.message : "Failed to reveal total supply");
    } finally {
      setIsRevealing(false);
    }
  }, [signer, address, contractAddress, isMerchant, getTotalSupplyHandle, decrypt]);

  const hideBalance = useCallback(() => {
    setBalance(null);
    setTotalSupply(null);
  }, []);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Your Points Balance</h3>

      <div style={styles.balanceBox}>
        {balance !== null ? (
          <div style={styles.revealedBalance}>
            <span style={styles.balanceValue}>{balance}</span>
            <span style={styles.balanceLabel}>points</span>
          </div>
        ) : (
          <div style={styles.hiddenBalance}>
            <span style={styles.encryptedIcon}>🔒</span>
            <span>Balance is encrypted</span>
          </div>
        )}
      </div>

      <div style={styles.buttonGroup}>
        {balance === null ? (
          <button
            onClick={revealBalance}
            disabled={isRevealing || isDecrypting}
            style={styles.revealButton}
          >
            {isRevealing || isDecrypting ? "Decrypting..." : "Reveal Balance"}
          </button>
        ) : (
          <button onClick={hideBalance} style={styles.hideButton}>
            Hide Balance
          </button>
        )}
      </div>

      {isMerchant && (
        <div style={styles.merchantSection}>
          <h4 style={styles.subTitle}>Total Supply (Merchant Only)</h4>
          <div style={styles.balanceBox}>
            {totalSupply !== null ? (
              <div style={styles.revealedBalance}>
                <span style={styles.balanceValue}>{totalSupply}</span>
                <span style={styles.balanceLabel}>total points</span>
              </div>
            ) : (
              <div style={styles.hiddenBalance}>
                <span style={styles.encryptedIcon}>🔒</span>
                <span>Total supply is encrypted</span>
              </div>
            )}
          </div>
          {totalSupply === null ? (
            <button
              onClick={revealTotalSupply}
              disabled={isRevealing || isDecrypting}
              style={styles.revealButton}
            >
              {isRevealing || isDecrypting ? "Decrypting..." : "Reveal Total Supply"}
            </button>
          ) : (
            <button onClick={hideBalance} style={styles.hideButton}>
              Hide
            </button>
          )}
        </div>
      )}

      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: "12px",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: "8px",
    border: "1px solid rgba(71, 85, 105, 0.5)",
  },
  title: {
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#e2e8f0",
  },
  subTitle: {
    fontSize: "12px",
    fontWeight: "500",
    marginBottom: "8px",
    color: "#94a3b8",
  },
  balanceBox: {
    padding: "12px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "6px",
    marginBottom: "10px",
    textAlign: "center" as const,
  },
  revealedBalance: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "2px",
  },
  balanceValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#4ade80",
    fontFamily: "monospace",
  },
  balanceLabel: {
    fontSize: "11px",
    color: "#94a3b8",
  },
  hiddenBalance: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
    color: "#64748b",
    fontSize: "12px",
  },
  encryptedIcon: {
    fontSize: "20px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  revealButton: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  hideButton: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid #475569",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  merchantSection: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid rgba(71, 85, 105, 0.5)",
  },
  error: {
    color: "#ef4444",
    fontSize: "11px",
    marginTop: "8px",
  },
};
