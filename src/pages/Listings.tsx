import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loadAllListings, purchaseFile } from "../utils/blockchainHelper";
import { sendPurchaseRequest } from "../utils/solidHelper";

const Listings: React.FC = () => {
    const { session, isAuthenticated } = useAuth();
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadListings = async () => {
        setLoading(true);

        try {
            const data = await loadAllListings();

            const otherListings = data.filter(
                (listing: any) => listing.webId !== session.info.webId
            );

            setListings(otherListings);
        } catch (err) {
            console.error("Failed to load listings:", err);
            alert("Failed to load listings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadListings();
        }
    }, [isAuthenticated, session.info.webId]);

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "Unknown";

        return new Date(timestamp * 1000).toLocaleString();
    };

    const buyListing = async (listing: any) => {
        try {
            const saleId = await purchaseFile(
                listing.fileUrl,
                session.info.webId!
            );

            await sendPurchaseRequest(
                session,
                listing.webId,
                listing.fileUrl,
                session.info.webId!,
                saleId
            );

            alert("Purchase request sent! Payment is locked until seller approval.");
        } catch (err) {
            console.error("Purchase failed:", err);
            alert("Purchase failed.");
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ padding: 20 }}>
                <h1>Listings</h1>
                <p>Please log in to view marketplace listings.</p>
                <Link to="/">Back to home</Link>
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <h1>Marketplace Listings</h1>

            <Link to="/">
                <button style={{ marginBottom: 20 }}>
                    Back to Home
                </button>
            </Link>

            <button onClick={loadListings} style={{ marginLeft: 10, marginBottom: 20 }}>
                Refresh Listings
            </button>

            {loading && <p>Loading listings...</p>}

            {!loading && listings.length === 0 && (
                <p>No listings from other users found.</p>
            )}

            {listings.map((listing, index) => (
                <div
                    key={`${listing.fileUrl}-${index}`}
                    style={{
                        border: "1px solid #ccc",
                        borderRadius: 8,
                        padding: 15,
                        marginBottom: 15
                    }}
                >
                    <h3>{listing.fileUrl.split("/").pop()}</h3>

                    <p><strong>Price:</strong> {listing.price} ETH</p>
                    <p><strong>Listed at:</strong> {formatDate(listing.listedAt)}</p>
                    <p><strong>Lister WebID:</strong> {listing.webId}</p>
                    <p><strong>Lister wallet:</strong> {listing.wallet}</p>
                    <p><strong>File URL:</strong> {listing.fileUrl}</p>
                    <p><strong>File hash:</strong> {listing.fileHash}</p>

                    <button onClick={() => buyListing(listing)}>
                        Buy Access
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Listings; 