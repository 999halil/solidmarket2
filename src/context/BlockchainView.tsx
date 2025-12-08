// pages/BlockchainView.tsx
import React, { useState } from "react";
import { getFilePrice, verifyFileHash } from "../utils/blockchainHelper";

const BlockchainView = () => {
  const [fileUrl, setFileUrl] = useState("");
  const [price, setPrice] = useState<string | null>(null);
  const [hashInput, setHashInput] = useState("");
  const [hashCheck, setHashCheck] = useState<boolean | null>(null);

  const fetchPrice = async () => {
    const result = await getFilePrice(fileUrl);
    setPrice(result);
  };

  const checkHash = async () => {
    const result = await verifyFileHash(fileUrl, hashInput);
    setHashCheck(result);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🔗 Blockchain Explorer</h1>

      <div>
        <h2>Check stored price</h2>
        <input
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="Enter file URL"
        />
        <button onClick={fetchPrice}>Get Price</button>

        {price !== null && <p>Price: {price} ETH</p>}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>Verify stored file hash</h2>
        <input
          value={hashInput}
          onChange={(e) => setHashInput(e.target.value)}
          placeholder="Enter SHA-256 hash"
        />
        <button onClick={checkHash}>Verify Hash</button>

        {hashCheck !== null && (
          <p>
            Hash match: {hashCheck ? "✅ Valid" : "❌ Invalid"}
          </p>
        )}
      </div>
    </div>
  );
};

export default BlockchainView;
