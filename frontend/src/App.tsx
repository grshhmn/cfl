import React, { useEffect } from "react";
import {
  useWallet,
  useFhevm,
  useLoyaltyContract,
} from "./hooks";
import {
  WalletConnect,
  MerchantPanel,
  CustomerPanel,
} from "./components";

function App() {
  const {
    address,
    signer,
    provider,
    isConnected,
    isConnecting,
    error: walletError,
    connect,
    disconnect,
  } = useWallet();

  const {
    status: fhevmStatus,
    error: fhevmError,
    initialize: initializeFhevm,
  } = useFhevm();

  const {
    contractAddress,
    contractInfo,
    isMerchant,
    isCustomer,
    isLoading: contractLoading,
    error: contractError,
    fetchContractInfo,
    getBalanceHandle,
    getTotalSupplyHandle,
    mintPoints,
    transferPoints,
    burnPoints,
  } = useLoyaltyContract(signer, provider);

  // Initialize FHEVM after wallet connects
  useEffect(() => {
    if (isConnected && fhevmStatus === "idle") {
      initializeFhevm();
    }
  }, [isConnected, fhevmStatus, initializeFhevm]);

  // Fetch contract info after FHEVM is ready
  useEffect(() => {
    if (fhevmStatus === "ready" && address) {
      fetchContractInfo(address);
    }
  }, [fhevmStatus, address, fetchContractInfo]);

  const renderStatus = () => {
    if (!isConnected) {
      return (
        <div style={styles.statusBox}>
          <span style={styles.statusIcon}>🔌</span>
          <span>Connect your wallet to get started</span>
        </div>
      );
    }

    if (fhevmStatus === "loading") {
      return (
        <div style={styles.statusBox}>
          <span style={styles.spinner} />
          <span>Initializing FHE encryption...</span>
        </div>
      );
    }

    if (fhevmStatus === "error") {
      return (
        <div style={{ ...styles.statusBox, ...styles.errorBox }}>
          <span style={styles.statusIcon}>⚠️</span>
          <span>FHE initialization failed: {fhevmError}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🎁</span>
            <div>
              <h1 style={styles.logoTitle}>
                Real Loyalty
              </h1>
              <p style={styles.logoSubtitle}>
                {contractInfo?.symbol ? `${contractInfo.symbol} • ` : ""}
                Powered by FHE Encryption
              </p>
            </div>
          </div>
          <WalletConnect
            address={address}
            isConnected={isConnected}
            isConnecting={isConnecting}
            error={walletError}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {renderStatus()}

        {/* Error Display */}
        {contractError && (
          <div style={{ ...styles.statusBox, ...styles.errorBox }}>
            <span style={styles.statusIcon}>⚠️</span>
            <span>{contractError}</span>
          </div>
        )}

        {/* Dashboard */}
        {isConnected && fhevmStatus === "ready" && signer && (
          <div style={styles.dashboard}>
            {/* Always show Merchant Panel */}
            <MerchantPanel
              address={address}
              signer={signer}
              contractAddress={contractAddress}
              mintPoints={mintPoints}
              getBalanceHandle={getBalanceHandle}
              isLoading={contractLoading}
            />

            {/* Always show Customer Panel */}
            <CustomerPanel
              address={address}
              signer={signer}
              contractAddress={contractAddress}
              isCustomer={true}
              transferPoints={transferPoints}
              burnPoints={burnPoints}
              getBalanceHandle={getBalanceHandle}
              getTotalSupplyHandle={getTotalSupplyHandle}
              isLoading={contractLoading}
              isMerchant={isMerchant}
            />
          </div>
        )}

        {/* Info Section */}
        {!isConnected && (
          <div style={styles.infoSection}>
            <h2 style={styles.infoTitle}>How It Works</h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoCard}>
                <span style={styles.infoIcon}>🔒</span>
                <h3 style={styles.infoCardTitle}>Private Balances</h3>
                <p style={styles.infoCardText}>
                  Your point balance is encrypted using Fully Homomorphic Encryption (FHE).
                  Competitors and other users cannot see how many points you have.
                </p>
              </div>
              <div style={styles.infoCard}>
                <span style={styles.infoIcon}>👀</span>
                <h3 style={styles.infoCardTitle}>Selective Visibility</h3>
                <p style={styles.infoCardText}>
                  Only you and the merchant can decrypt and view your balance.
                  This ensures privacy while maintaining business functionality.
                </p>
              </div>
              <div style={styles.infoCard}>
                <span style={styles.infoIcon}>🔄</span>
                <h3 style={styles.infoCardTitle}>Encrypted Transfers</h3>
                <p style={styles.infoCardText}>
                  Transfer points to other customers with encrypted amounts.
                  Nobody can see how many points are being transferred.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>
          Built with{" "}
          <a
            href="https://docs.zama.ai/fhevm"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            Zama FHEVM
          </a>{" "}
          • Real Loyalty
        </p>
        {contractAddress && (
          <p style={styles.contractAddress}>
            Contract:{" "}
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(71, 85, 105, 0.3)",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  headerContent: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    fontSize: "32px",
  },
  logoTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#f1f5f9",
    margin: 0,
  },
  logoSubtitle: {
    fontSize: "12px",
    color: "#64748b",
    margin: 0,
  },
  main: {
    flex: 1,
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
  },
  statusBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 24px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "12px",
    marginBottom: "24px",
    color: "#93c5fd",
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
  },
  statusIcon: {
    fontSize: "20px",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(59, 130, 246, 0.3)",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  infoSection: {
    marginTop: "48px",
  },
  infoTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: "32px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  },
  infoCard: {
    padding: "24px",
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderRadius: "12px",
    border: "1px solid rgba(71, 85, 105, 0.3)",
    textAlign: "center",
  },
  infoIcon: {
    fontSize: "40px",
    display: "block",
    marginBottom: "16px",
  },
  infoCardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#e2e8f0",
    marginBottom: "8px",
  },
  infoCardText: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  footer: {
    padding: "24px",
    textAlign: "center",
    borderTop: "1px solid rgba(71, 85, 105, 0.3)",
    color: "#64748b",
    fontSize: "14px",
  },
  link: {
    color: "#3b82f6",
    textDecoration: "none",
  },
  contractAddress: {
    marginTop: "8px",
    fontSize: "12px",
    fontFamily: "monospace",
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;
