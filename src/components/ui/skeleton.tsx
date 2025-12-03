import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-gray-200 animate-pulse rounded-md ${className}`} />
);
