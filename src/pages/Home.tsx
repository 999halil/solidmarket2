import React from "react";
import LoginButton from "../components/LoginButton";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import FileManager from "../components/FileManager";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div>
            <h1>Welcome to the SoLiD Marketplace</h1>
             {/* 🔗 Blockchain Explorer Button */}
            <Link to="/blockchain">
                <button style={{ marginBottom: "20px" }}>
                    🔍 View Blockchain Data
                </button>
            </Link>
            {isAuthenticated ? (
                <>
                    <LogoutButton />
                    <Profile />
                    <FileManager />
                </>
            ) : (
                <LoginButton />
            )}
        </div>
    );
};

export default Home;
