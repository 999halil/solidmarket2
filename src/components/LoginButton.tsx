import React from "react";
import { useAuth } from "../context/AuthContext";

const LoginButton: React.FC = () => {
    const { login } = useAuth();

    const handleLogin = () => {
        const provider = prompt("Enter your SoLiD Identity Provider (e.g., https://broker.pod.inrupt.com)","https://solidcommunity.net");
        if (provider) {
            login(provider);
        }
    };

    return <button onClick={handleLogin}>Login with SoLiD</button>;
};

export default LoginButton;
