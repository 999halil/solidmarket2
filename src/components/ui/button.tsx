import React from "react";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, children, ...props }) => (
    <button
        className={`px-4 py-2 font-semibold rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
        {...props}
    >
        {children}
    </button>
);
