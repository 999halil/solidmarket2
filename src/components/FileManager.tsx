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
    setFilePermissionsACL,
    prepareMarketplaceInbox
} from "../utils/solidHelper";

import {
    storeListing,
    loadAllListings,
    getFilePrice,
    purchaseFile,
    verifyFileHash,
    deleteListing
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
            const start = performance.now();

        const chainListings = await loadAllListings();
        

        const myListings = chainListings.filter(
            (listing: any) => listing.webId === session.info.webId
        );
        const end = performance.now();
        console.log("PERF_RESULT,Load marketplace listings," + Math.round(end - start));


        setListings(myListings);
    };
    const handleDeleteListing = async (fileUrl: string) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this listing? The file will remain in your Solid Pod."
        );

        if (!confirmed) return;

        try {
            await deleteListing(fileUrl);

            await loadBlockchainListings();
            await loadUploads();

            alert("Listing deleted.");
        } catch (err) {
            console.error("Failed to delete listing:", err);
            alert("Failed to delete listing.");
        }
    };

    const loadUploads = async () => {
        if (!podUrl) return;
        const start = performance.now();

        await ensureContainerExists(session, `${podUrl}resources/`);
        const files = await listFilesInPod(session, podUrl);
        const end = performance.now();
        console.log("PERF_RESULT,Load uploaded files," + Math.round(end - start));


        setUploadedFiles(files);

        const chainListings = await loadAllListings();
        const listedUrls = chainListings.map((l) => l.fileUrl);

        setNotListed(files.filter((f) => !listedUrls.includes(f)));
    };

    const handleUpload = async () => {
        if (!selectedFile || !podUrl) return;

        try {
            const start = performance.now();

            const fileUrl = await uploadFileToPod(session, selectedFile, podUrl);
            const end = performance.now();
            console.log("PERF_RESULT,Upload file to Pod," + Math.round(end - start));


            if (fileUrl) {
                // Immediately update UI without waiting for Pod refresh consistency
                setUploadedFiles((prev) =>
                    prev.includes(fileUrl) ? prev : [...prev, fileUrl]
                );

                setNotListed((prev) =>
                    prev.includes(fileUrl) ? prev : [...prev, fileUrl]
                );

                // Optional: still reload from the Pod afterwards
                await loadUploads();
            }

            setSelectedFile(null);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Upload failed.");
        }
    };

    const createListing = async (fileUrl: string) => {
            const start = performance.now();

        const price = listingPrices[fileUrl];

        if (!price) {
            alert("Please enter a price for this file.");
            return;
        }

        const response = await session.fetch(fileUrl);
        const blob = await response.blob();
        const hash = await computeSHA256(new File([blob], "file"));
        await prepareMarketplaceInbox(session);

        await storeListing(fileUrl, hash, price, session.info.webId!);
            const end = performance.now();
    console.log("PERF_RESULT,Create listing," + Math.round(end - start));


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

            <button
                onClick={loadUploads}
                style={{ marginBottom: 10 }}
            >
                🔄 Refresh Uploaded Files
            </button>

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
            <h2 style={{ marginTop: 40 }}>🛒My Active Listings (Blockchain)</h2>

            <button
                style={{ marginBottom: 10 }}
                onClick={loadBlockchainListings}
            >
                🔄 Refresh Listings
            </button>

            {listings.length === 0 && <p>You have no active listings.</p>}

            {listings.map((l, index) => (
                <div key={index} style={{ borderBottom: "1px solid #ccc", padding: 10 }}>
                    <p><strong>File:</strong> {l.fileUrl.split("/").pop()}</p>
                    <p><strong>Price:</strong> {l.price} ETH</p>
                    <p><strong>Listed at:</strong> {
                        l.listedAt
                            ? new Date(l.listedAt * 1000).toLocaleString()
                            : "Unknown"
                    }</p>
                    <p><strong>File URL:</strong> {l.fileUrl}</p>
                    <p><strong>Hash:</strong> {l.fileHash}</p>

                    <button
                        onClick={() => handleDeleteListing(l.fileUrl)}
                        style={{ marginTop: 10 }}
                    >
                        Delete Listing
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
