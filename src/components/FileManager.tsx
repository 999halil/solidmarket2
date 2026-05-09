// components/FileManager.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
    computeSHA256,
    uploadFileToPod,
    listFilesInPod,
    ensureContainerExists, setFilePermissionsACP,
    grantBuyerReadAccess,
    sendPurchaseRequest,
    setFilePermissionsACL
} from "../utils/solidHelper";

import {
    storeListing,
    loadAllListings,
    getFilePrice,
    purchaseFile,
    verifyFileHash
} from "../utils/blockchainHelper";

const FileManager: React.FC = () => {
    const { session } = useAuth();

    // FILE STATE
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [listings, setListings] = useState<any[]>([]);
    const [notListed, setNotListed] = useState<string[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [listingPrices, setListingPrices] = useState<{ [fileUrl: string]: string }>({});

    const podUrl = session.info.webId?.replace("/profile/card#me", "/");

    useEffect(() => {
        if (!podUrl) return;
        loadUploads();
        loadBlockchainListings();
    }, [podUrl]);

    const loadBlockchainListings = async () => {
        const chainListings = await loadAllListings();
        setListings(chainListings);
    };

    const loadUploads = async () => {
        if (!podUrl) return;

        await ensureContainerExists(session, `${podUrl}resources/`);
        const files = await listFilesInPod(session, podUrl);

        setUploadedFiles(files);

        const chainListings = await loadAllListings();
        const listedUrls = chainListings.map((l) => l.fileUrl);

        setNotListed(files.filter((f) => !listedUrls.includes(f)));
    };

    const handleUpload = async () => {
        if (!selectedFile || !podUrl) return;

        const fileUrl = await uploadFileToPod(session, selectedFile, podUrl);
        if (fileUrl) {
            //await setFilePermissionsACP(session, fileUrl);
        }
        await loadUploads();
        setSelectedFile(null);
    };

    const createListing = async (fileUrl: string) => {
    const price = listingPrices[fileUrl];

    if (!price) {
        alert("Please enter a price for this file.");
        return;
    }

    const response = await session.fetch(fileUrl);
    const blob = await response.blob();
    const hash = await computeSHA256(new File([blob], "file"));

    await storeListing(fileUrl, hash, price, session.info.webId!);

    await loadBlockchainListings();
    await loadUploads();

    setListingPrices((prev) => {
        const updated = { ...prev };
        delete updated[fileUrl];
        return updated;
    });

    alert("Listing created!");
};

    return (
        <div style={{ padding: 20 }}>
            <h2>📁 My Uploaded Files (Not Listed Yet)</h2>

            {notListed.length === 0 && <p>No unlisted uploads.</p>}

            {notListed.map((url) => (
                <div key={url} style={{ borderBottom: "1px solid #ccc", padding: 10 }}>
                    <span>{url.split("/").pop()}</span>

                  <input
    type="text"
    placeholder="Set price in ETH"
    value={listingPrices[url] || ""}
    onChange={(e) =>
        setListingPrices((prev) => ({
            ...prev,
            [url]: e.target.value,
        }))
    }
    style={{ marginLeft: 10 }}
/>
                    <button
                        style={{ marginLeft: 10 }}
                        onClick={() => createListing(url)}
                    >
                        Create Listing
                    </button>
                </div>
            ))}
            <h2 style={{ marginTop: 40 }}>🛒 Active Listings (Blockchain)</h2>

            <button
                style={{ marginBottom: 10 }}
                onClick={loadBlockchainListings}
            >
                🔄 Refresh Listings
            </button>

            {listings.length === 0 && <p>No items listed.</p>}

            {listings.map((l, index) => (
                <div key={index} style={{ borderBottom: "1px solid #ccc", padding: 10 }}>
                    <p><strong>File:</strong> {l.fileUrl.split("/").pop()}</p>
                    <p><strong>Price:</strong> {l.price} ETH</p>
                    <p><strong>Lister WebID:</strong> {l.webId}</p>

                    <button
                        onClick={async () => {
                            try {
                                console.log("🛒 Purchasing on blockchain...");
                                const saleId = await purchaseFile(
    l.fileUrl,
    session.info.webId!
);

await sendPurchaseRequest(
    session,
    l.webId,
    l.fileUrl,
    session.info.webId!,
    saleId
);

alert("Purchase request sent! Payment is locked until seller approval.");

                                alert("Purchase request sent! Seller must approve.");

                            } catch (err) {
                                console.error(err);
                                alert("Purchase failed.");
                            }
                        }}
                    >
                        Buy Access
                    </button>

                </div>
            ))}


            <h2 style={{ marginTop: 40 }}>⬆️ Upload New File</h2>

            <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />

            <button
                onClick={handleUpload}
                style={{ marginLeft: 10 }}
                disabled={!selectedFile}
            >
                Upload
            </button>
        </div>
    );
};

export default FileManager;
