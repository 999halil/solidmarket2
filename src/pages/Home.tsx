import React from "react";
import LoginButton from "../components/LoginButton";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import FileManager from "../components/FileManager";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import ACPTestBasic from "../components/ACPTestBasic"
const Home: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div>
            <h1>Welcome to the SoLiD Marketplace</h1>
             {isAuthenticated ? (
                <>
            
             {/* 🔗 Blockchain Explorer Button */}
            <Link to="/blockchain">
                <button style={{ marginBottom: "20px" }}>
                    🔍 View Blockchain Data
                </button>
            </Link>
            <Link to="/listings">
    <button style={{ marginBottom: "20px" }}>
        🛒 View Marketplace Listings
    </button>
</Link>

            <Link to="/inbox">
                <button style={{ marginBottom: "20px" }}>
                    Inbox
                </button>
            </Link>
           
                    <LogoutButton />
                    <Profile />
                    <ACPTestBasic/>
                    <FileManager />
                </>
            ) : (
                <LoginButton />
            )}
        </div>
    );
};

export default Home;
