// utils/blockchainHelper.ts
import { BrowserProvider, Contract } from "ethers";
import { ethers } from "ethers";

// Extend the Window type to recognize Ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
    "event FileStored(address indexed listerWallet, string webId, string fileUrl, string fileHash, uint256 price)",
    "function storeFileHashWithPrice(string fileUrl, string fileHash, uint256 price, string webId) public payable",
    "function getFilePrice(string fileUrl) public view returns (uint256)",
    "function purchaseFile(string fileUrl) public payable",
    "function verifyFileHash(string fileUrl, string fileHash) public view returns (bool)"
];

export const getContract = async () => {
    if (!window.ethereum) throw new Error("Ethereum wallet required");

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, ABI, signer);
};

// STORE LISTING
export const storeListing = async (fileUrl: string, fileHash: string, price: string, webId: string) => {
    const contract = await getContract();
    const tx = await contract.storeFileHashWithPrice(
        fileUrl,
        fileHash,
        ethers.parseEther(price),
        webId
    );
    await tx.wait();
};

// GET PRICE
export const getFilePrice = async (fileUrl: string): Promise<string> => {
    const contract = await getContract();
    const price = await contract.getFilePrice(fileUrl);
    return ethers.formatEther(price);
};

// PURCHASE FILE
export const purchaseFile = async (fileUrl: string) => {
    const contract = await getContract();
    const price = await getFilePrice(fileUrl);
    const tx = await contract.purchaseFile(fileUrl, { value: ethers.parseEther(price) });
    await tx.wait();
};

// VERIFY HASH
export const verifyFileHash = async (fileUrl: string, fileHash: string) => {
    const contract = await getContract();
    return await contract.verifyFileHash(fileUrl, fileHash);
};

// LOAD ALL LISTINGS (from events)
export const loadAllListings = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

    const events = await contract.queryFilter("FileStored");

    return events.map((ev: any) => ({
        wallet: ev.args.listerWallet,
        webId: ev.args.webId,
        fileUrl: ev.args.fileUrl,
        fileHash: ev.args.fileHash,
        price: ethers.formatEther(ev.args.price)
    }));
};
