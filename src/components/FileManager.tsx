import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { computeSHA256, uploadFileToPod, listFilesInPod, logFileAcl, setFilePermissions, setFilePermissionsACP, setAppFullAccess } from "../utils/solidHelper";
import { verifyFileHash, storeFileHashWithPrice, getFilePrice, purchaseFile } from "../utils/blockchainHelper";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import styles from "./FileManager.module.css";
import { ensureContainerExists } from "../utils/solidHelper";

const FileManager: React.FC = () => {
    const { session } = useAuth();
    const [files, setFiles] = useState<{ url: string; price: string; access: boolean }[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePrice, setFilePrice] = useState<string>("");

    const [verificationResult, setVerificationResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const podUrl = session.info.webId?.replace("/profile/card#me", "/");

    useEffect(() => {
        if (podUrl) fetchFiles();
    }, [podUrl]);

    const fetchFiles = async () => {
        if (!podUrl) return;
        setIsLoading(true);
        const containerUrl = `${podUrl}resources/`; // <-- your desired folder
        await ensureContainerExists(session, containerUrl);

        const fileList = await listFilesInPod(session, podUrl);
        const filesWithPrices = await Promise.all(
            fileList.map(async (fileUrl) => ({
                url: fileUrl,
                price: await getFilePrice(fileUrl),
                access: await hasFileAccess(fileUrl)
            }))
        );

        setFiles(filesWithPrices);
        for (const fileUrl of fileList) {
            await logFileAcl(session, fileUrl);
        }
        setIsLoading(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handlePurchase = async (fileUrl: string) => {
        setIsLoading(true);
        try {
            await purchaseFile(fileUrl); // Blockchain transaction
            await setFilePermissions(session, fileUrl, "shared", session.info.webId!); // Set permissions after purchase
            fetchFiles();
        } catch (error) {
            console.error("Error during purchase:", error);
        }
        setIsLoading(false);
    };

    const hasFileAccess = async (fileUrl: string): Promise<boolean> => {
        try {
            const response = await session.fetch(fileUrl);
            return response.ok;
        } catch (error) {
            console.error("Error checking access:", error);
            return false;
        }
    };
    const handleDownload = async (fileUrl: string) => {
        try {
            const response = await session.fetch(fileUrl);
            if (!response.ok) throw new Error("Access denied or file not found.");
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = fileUrl.split("/").pop() || "file";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };
    const handleViewFile = async (fileUrl: string) => {
    try {
        const response = await session.fetch(fileUrl, { method: "GET", headers: {} });
        if (!response.ok) {
            throw new Error("Access denied or file not found.");
        }
        const blob = await response.blob();
        const fileType = blob.type;

        const blobUrl = URL.createObjectURL(new Blob([blob], { type: fileType }));
        window.open(blobUrl, "_blank");
    } catch (error) {
        console.error("View failed:", error);
        alert("❌ Could not open file. You may not have access.");
    }
};



    const handleUpload = async () => {
        if (!selectedFile || !podUrl) return;
        setIsLoading(true);
        const hash = await computeSHA256(selectedFile);
        const fileUrl = await uploadFileToPod(session, selectedFile, podUrl);
        if (fileUrl) {
            await storeFileHashWithPrice(fileUrl, hash, filePrice,session.info.webId!);
            await setFilePermissionsACP(session, fileUrl);
            await setAppFullAccess(session, fileUrl);       // ← gives app full control

        }
        fetchFiles();
        setSelectedFile(null);
        setFilePrice("");
        setIsLoading(false);
    }; 

    const handleVerify = async (fileUrl: string) => {
        setIsLoading(true);
        try {
            const response = await session.fetch(fileUrl);
            if (response.status === 401) {
                setVerificationResult("❌ Access denied. Purchase required.");
            } else {
                const fileBlob = await response.blob();
                const newHash = await computeSHA256(new File([fileBlob], "file"));
                const isValid = await verifyFileHash(fileUrl, newHash);
                setVerificationResult(isValid ? "✅ Authentic File" : "❌ File Tampered");
            }
        } catch (error) {
            console.error("Error verifying file:", error);
            setVerificationResult("❌ Error verifying file");
        }
        setIsLoading(false);
    };


    return (
        <div className="file-manager-container">
            <h2 className="title">🛒 Marketplace File Manager</h2>

            <div className="upload-section">
                <input type="file" onChange={handleFileChange} />
                <input
                    type="text"
                    placeholder="Set price in ETH"
                    value={filePrice}
                    onChange={(e) => setFilePrice(e.target.value)}
                    className="price-input"
                />
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !filePrice || isLoading}
                    className="upload-button"
                >
                    {isLoading ? "Uploading..." : "Upload with Price"}
                </button>
            </div>

            <h3 className="subtitle">🗃️ Available Files</h3>
            <div className="file-list">
                {files.map(({ url, price, access }) => (
                    <div key={url} className="file-card">
                        <span>{url.split("/").pop()}</span>
                        <span>💰 {price} ETH</span>
                        <div className="button-group">
                            {access ? (
                                <>
                                    <button onClick={() => handleDownload(url)}>⬇️ Download</button>
                                    <button onClick={() => handleVerify(url)}>Check Integrity</button>
                                    <button onClick={() => handleViewFile(url)}>👁️ View File</button>

                                </>
                            ) : (
                                <button onClick={() => handlePurchase(url)}>Buy Access</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {verificationResult && (
                <div className="verification-result">
                    <p>{verificationResult}</p>
                </div>
            )}
        </div>
    );
};

export default FileManager;