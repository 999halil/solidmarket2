// utils/blockchainHelper.ts
import { BrowserProvider, Contract } from "ethers";
import { ethers } from "ethers";

// Extend the Window type to recognize Ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ABI = [
    "event FileStored(address indexed listerWallet, string webId, string fileUrl, string fileHash, uint256 price)",
    "event SaleRequested(uint256 indexed saleId, string fileUrl, address indexed buyerWallet, address indexed sellerWallet, string buyerWebId, uint256 amount)",
    "event SaleApproved(uint256 indexed saleId)",
    "event SaleRejected(uint256 indexed saleId)",
    "event SaleRefunded(uint256 indexed saleId)",

    "function storeFileHashWithPrice(string fileUrl, string fileHash, uint256 price, string webId) public",
    "function getFilePrice(string fileUrl) public view returns (uint256)",
    "function purchaseFile(string fileUrl, string buyerWebId) public payable returns (uint256)",
    "function approveSale(uint256 saleId) public",
    "function rejectSale(uint256 saleId) public",
    "function refundAfterTimeout(uint256 saleId) public",
    "function getSaleStatus(uint256 saleId) public view returns (uint8)",
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
export const purchaseFile = async (
    fileUrl: string,
    buyerWebId: string
): Promise<string> => {
    const contract = await getContract();
    const price = await getFilePrice(fileUrl);

    const tx = await contract.purchaseFile(
        fileUrl,
        buyerWebId,
        {
            value: ethers.parseEther(price),
        }
    );

    const receipt = await tx.wait();

    const saleRequestedEvent = receipt.logs
        .map((log: any) => {
            try {
                return contract.interface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find((event: any) => event && event.name === "SaleRequested");

    if (!saleRequestedEvent) {
        throw new Error("SaleRequested event not found");
    }

    return saleRequestedEvent.args.saleId.toString();
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
export const approveSale = async (saleId: string | number) => {
    const contract = await getContract();
    const tx = await contract.approveSale(saleId);
    await tx.wait();
};

export const rejectSale = async (saleId: string | number) => {
    const contract = await getContract();
    const tx = await contract.rejectSale(saleId);
    await tx.wait();
};

export const refundAfterTimeout = async (saleId: string | number) => {
    const contract = await getContract();
    const tx = await contract.refundAfterTimeout(saleId);
    await tx.wait();
};

export const getSaleStatus = async (saleId: string | number): Promise<number> => {
    const contract = await getContract();
    const status = await contract.getSaleStatus(saleId);
    return Number(status);
};
