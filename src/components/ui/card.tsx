import React from "react";

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm ${className}`}>
        {children}
    </div>
);

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
    <div className={`p-4 ${className}`}>{children}</div>
);
