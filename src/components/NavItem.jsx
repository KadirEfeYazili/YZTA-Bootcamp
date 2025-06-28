import React from 'react';

const NavItem = ({ tabName, icon, children, activeTab, setActiveTab }) => (
    <button 
        onClick={() => setActiveTab(tabName)} 
        className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium rounded-lg transition-all ${
            activeTab === tabName 
                ? 'bg-violet-100 text-violet-800 shadow-inner' 
                : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700'
        }`}
    >
        {icon} {children}
    </button>
);

export default NavItem; 