import React from 'react';

interface UsageCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export const UsageCard: React.FC<UsageCardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 mb-4 w-full text-left">
      <div className="flex items-center mb-4">
        {icon && <span className="mr-2 text-xl">{icon}</span>}
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      </div>
      {children}
    </div>
  );
};
