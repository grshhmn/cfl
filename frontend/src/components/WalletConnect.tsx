import React from "react";

interface WalletConnectProps {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletConnect({
  address,
  isConnected,
  isConnecting,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div style={styles.container}>
      {isConnected ? (
        <div style={styles.connectedContainer}>
          <div style={styles.addressBadge}>
            <span style={styles.dot} />
            <span>{truncateAddress(address)}</span>
          </div>
          <button onClick={onDisconnect} style={styles.disconnectButton}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          style={styles.connectButton}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
  },
  connectedContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  addressBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    border: "1px solid rgba(74, 222, 128, 0.3)",
    borderRadius: "8px",
    color: "#4ade80",
    fontSize: "14px",
    fontFamily: "monospace",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#4ade80",
  },
  connectButton: {
    padding: "12px 24px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    transition: "background-color 0.2s",
  },
  disconnectButton: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "1px solid #475569",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  error: {
    color: "#ef4444",
    fontSize: "14px",
  },
};
