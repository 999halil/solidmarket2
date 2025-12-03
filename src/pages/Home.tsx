import React from "react";
import LoginButton from "../components/LoginButton";
import LogoutButton from "../components/LogoutButton";
import Profile from "../components/Profile";
import FileManager from "../components/FileManager";
import { useAuth } from "../context/AuthContext";

const Home: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <div>
            <h1>Welcome to the SoLiD Marketplace</h1>
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
