// pages/BlockchainView.tsx
import React, { useState } from "react";
import {
    getFilePrice,
    verifyFileHash,
    loadAllListings
} from "../utils/blockchainHelper";

const BlockchainView = () => {
    const [fileUrl, setFileUrl] = useState("");
    const [price, setPrice] = useState<string | null>(null);
    const [hashInput, setHashInput] = useState("");
    const [hashCheck, setHashCheck] = useState<boolean | null>(null);

    const [allListings, setAllListings] = useState<any[]>([]);

    const loadListings = async () => {
        const data = await loadAllListings();
        setAllListings(data);
    };

    return (
        <div style={{ padding: "2rem" }}>
            <h1>🔗 Blockchain Explorer</h1>

            <h2>Check Stored Price</h2>
            <input
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
            />
            <button onClick={async () => setPrice(await getFilePrice(fileUrl))}>
                Get Price
            </button>
            {price && <p>Price: {price} ETH</p>}

            <h2 style={{ marginTop: 20 }}>Verify Hash</h2>
            <input
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
            />
            <button
                onClick={async () =>
                    
                    setHashCheck(await verifyFileHash(fileUrl, hashInput))
                }
            >
                Verify
            </button>
            {hashCheck !== null && (
                <p>{hashCheck ? "✔ Match" : "❌ Does not match"}</p>
            )}

            <h2 style={{ marginTop: 20 }}>All Listings</h2>
            <button onClick={loadListings}>Load Listings</button>

            {allListings.map((l, i) => (
                <div key={i} style={{ borderBottom: "1px solid #ccc", padding: 10 }}>
                    <p><strong>File:</strong> {l.fileUrl}</p>
                    <p><strong>Hash:</strong> {l.fileHash}</p>
                    <p><strong>Price:</strong> {l.price} ETH</p>
                    <p><strong>Lister WebID:</strong> {l.webId}</p>
                    <p><strong>Wallet:</strong> {l.wallet}</p>
                </div>
            ))}
        </div>
    );
};

export default BlockchainView;
