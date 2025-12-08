import { BrowserProvider, Contract } from "ethers";
import { ethers, parseEther, formatEther } from "ethers";

// Extend the Window type to recognize Ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

//const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";


const ABI = [
  "event FileStored(address indexed listerWallet, string webId, string fileUrl, string fileHash, uint256 price)",
  "function storeFileHashWithPrice(string fileUrl, string fileHash, uint256 price, string webId) public payable",
  "function getFilePrice(string fileUrl) public view returns (uint256)",
  "function purchaseFile(string fileUrl) public payable",
  "function verifyFileHash(string fileUrl, string fileHash) public view returns (bool)"
];

/**
 * Connects to the Ethereum smart contract.
 */
export const getContract = async () => {
    if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask or another Ethereum wallet is required.");
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return new Contract(CONTRACT_ADDRESS, ABI, signer);
};

/**
 * Stores the file hash on the blockchain.
 */
export const storeFileHash = async (fileUrl: string, fileHash: string) => {
    console.log(`Storing hash for ${fileUrl}: ${fileHash}`); // Debug log

    const contract = await getContract();
    const tx = await contract.storeFileHash(fileUrl, fileHash);
    await tx.wait();

    console.log(`Stored hash successfully for ${fileUrl}`);
};

export const storeFileHashWithPrice = async (
  fileUrl: string,
  fileHash: string,
  price: string,
  webId: string
) => {
  const contract = await getContract();
  const tx = await contract.storeFileHashWithPrice(
    fileUrl,
    fileHash,
    ethers.parseEther(price),
    webId
  );
  await tx.wait();
};
export const loadAllBlockchainFiles = async () => {
  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  const logs = await contract.queryFilter("FileStored");
  return logs.map((log: any) => ({
    wallet: log.args.listerWallet,
    webId: log.args.webId,
    fileUrl: log.args.fileUrl,
    fileHash: log.args.fileHash,
    price: ethers.formatEther(log.args.price)
  }));
};



export const getFilePrice = async (fileUrl: string): Promise<string> => {
    const contract = await getContract();
    const price = await contract.getFilePrice(fileUrl);
    return ethers.formatEther(price);
};

export const purchaseFile = async (fileUrl: string) => {
    const contract = await getContract();
    const price = await getFilePrice(fileUrl);
    const tx = await contract.purchaseFile(fileUrl, { value: ethers.parseEther(price) });
    await tx.wait();
};

/**
 * Verifies if a file's hash matches the stored hash.
 */
export const verifyFileHash = async (fileUrl: string, fileHash: string) => {
    const contract = await getContract();
    return await contract.verifyFileHash(fileUrl, fileHash);
};
