import { createInstance, SepoliaConfig, initSDK } from "@zama-fhe/relayer-sdk/web";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";

let fheInstance: FhevmInstance | null = null;
let isInitialized = false;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export async function initializeFheInstance(): Promise<FhevmInstance> {
  if (fheInstance && isInitialized) return fheInstance;

  if (!window.ethereum) {
    throw new Error("Ethereum provider not found. Please install MetaMask.");
  }

  // Initialize WASM first
  await initSDK();

  // Create instance with network provider
  const config = { ...SepoliaConfig, network: window.ethereum };
  fheInstance = await createInstance(config);
  isInitialized = true;

  return fheInstance;
}

export function getFheInstance(): FhevmInstance | null {
  return fheInstance;
}

export function isInstanceInitialized(): boolean {
  return isInitialized;
}
