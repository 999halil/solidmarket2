import React, { useState } from "react";
import { getFilePrice, verifyFileHash, loadAllBlockchainFiles } from "../utils/blockchainHelper";

const BlockchainView = () => {
  const [fileUrl, setFileUrl] = useState("");
  const [price, setPrice] = useState<string | null>(null);
  const [hashInput, setHashInput] = useState("");
  const [hashCheck, setHashCheck] = useState<boolean | null>(null);

  const [allFiles, setAllFiles] = useState<any[]>([]);

  const fetchPrice = async () => {
    const result = await getFilePrice(fileUrl);
    setPrice(result);
  };

  const checkHash = async () => {
    const result = await verifyFileHash(fileUrl, hashInput);
    setHashCheck(result);
  };

  const loadFilesFromChain = async () => {
    const files = await loadAllBlockchainFiles();
    setAllFiles(files);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🔗 Blockchain Explorer</h1>

      {/* --- PRICE CHECK --- */}
      <h2>Check stored price</h2>
      <input
        value={fileUrl}
        onChange={(e) => setFileUrl(e.target.value)}
        placeholder="Enter file URL"
      />
      <button onClick={fetchPrice}>Get Price</button>
      {price !== null && <p>Price: {price} ETH</p>}

      {/* --- HASH CHECK --- */}
      <h2 style={{ marginTop: "2rem" }}>Verify stored file hash</h2>
      <input
        value={hashInput}
        onChange={(e) => setHashInput(e.target.value)}
        placeholder="Enter SHA-256 hash"
      />
      <button onClick={checkHash}>Verify Hash</button>
      {hashCheck !== null && (
        <p>Hash match: {hashCheck ? "✅ Valid" : "❌ Invalid"}</p>
      )}

      {/* --- ALL FILE LISTINGS --- */}
      <h2 style={{ marginTop: "2rem" }}>All Files Stored On Blockchain</h2>
      <button onClick={loadFilesFromChain}>Load Blockchain Data</button>

      {allFiles.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {allFiles.map((f, i) => (
            <div key={i} style={{ padding: "1rem", border: "1px solid #ddd", marginBottom: "1rem" }}>
              <p><strong>Wallet:</strong> {f.wallet}</p>
              <p><strong>WebID:</strong> {f.webId}</p>
              <p><strong>File URL:</strong> {f.fileUrl}</p>
              <p><strong>Hash:</strong> {f.fileHash}</p>
              <p><strong>Price:</strong> {f.price} ETH</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockchainView;
