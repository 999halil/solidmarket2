// utils/blockchainHelper.ts
import { BrowserProvider, Contract, Result } from "ethers";
import { ethers } from "ethers";

// Extend the Window type to recognize Ethereum
declare global {
    interface Window {
        ethereum?: any;
    }
}

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const ABI = [
"event FileStored(address indexed listerWallet, string webId, string fileUrl, string fileHash, uint256 price, uint256 listedAt)",
"function getFileData(string fileUrl) public view returns (address, string, string, string, uint256, bool, uint256)",
"event ListingDeleted(string fileUrl, address indexed listerWallet)",
"function deleteListing(string fileUrl) public",    "event SaleRequested(uint256 indexed saleId, string fileUrl, address indexed buyerWallet, address indexed sellerWallet, string buyerWebId, uint256 amount)",
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
export const deleteListing = async (fileUrl: string) => {
    const contract = await getContract();
    const tx = await contract.deleteListing(fileUrl);
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
            const start = performance.now();

    const contract = await getContract();
    const result = await contract.verifyFileHash(fileUrl,fileHash);
                const end = performance.now();
        console.log("PERF_RESULT,Verify hash," + Math.round(end - start));

    
    return result;
};

// LOAD ALL LISTINGS (from events)
export const loadAllListings = async () => {
  if (!window.ethereum) throw new Error("Ethereum wallet required");

  const provider = new BrowserProvider(window.ethereum);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  const storedEvents = await contract.queryFilter(
    contract.filters.FileStored(),
    0,
    "latest"
  );

  console.log("FileStored events found:", storedEvents.length);

  const uniqueFileUrls = Array.from(
    new Set(
      storedEvents
        .map((ev: any) => ev.args?.fileUrl)
        .filter((url: string | undefined) => !!url)
    )
  );

  console.log("Unique listed file URLs:", uniqueFileUrls);

  const listings = await Promise.all(
    uniqueFileUrls.map(async (fileUrl: string) => {
      try {
        const data = await contract.getFileData(fileUrl);

        const wallet = data[0];
        const webId = data[1];
        const returnedFileUrl = data[2];
        const fileHash = data[3];
        const price = data[4];
        const active = data[5];
        const listedAt = data[6];

        if (!active) {
          return null;
        }

        return {
          wallet,
          webId,
          fileUrl: returnedFileUrl,
          fileHash,
          price: ethers.formatEther(price),
          listedAt: Number(listedAt),
        };
      } catch (err) {
        console.error("Failed to load listing state for:", fileUrl, err);
        return null;
      }
    })
  );

  const activeListings = listings.filter((listing) => listing !== null);

  console.log("Active listings loaded:", activeListings);

  return activeListings;
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
