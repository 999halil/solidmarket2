import { BrowserProvider, Contract } from "ethers";
import { ethers, parseEther, formatEther } from "ethers";

// Extend the Window type to recognize Ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

//const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";



const ABI = [
    "function storeFileHashWithPrice(string memory fileUrl, string memory fileHash, uint256 price) public payable",
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

export const storeFileHashWithPrice = async (fileUrl: string, fileHash: string, price: string) => {
    console.log(`Storing hash for ${fileUrl} price= ${price}: ${fileHash} `); // Debug log

    const contract = await getContract();
    const tx = await contract.storeFileHashWithPrice(fileUrl, fileHash, ethers.parseEther(price));
    await tx.wait();
    console.log(`Stored hash successfully for ${fileUrl}`);

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
