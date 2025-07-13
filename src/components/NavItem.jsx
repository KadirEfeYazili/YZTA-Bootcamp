import React from 'react';

const NavItem = ({ tabName, icon, children, activeTab, setActiveTab, isSidebarOpen }) => (
    <button 
        onClick={() => setActiveTab(tabName)} 
        className={`w-full flex items-center px-4 py-3 text-left text-sm font-medium rounded-lg transition-all ${
            activeTab === tabName 
                ? 'bg-violet-100 text-violet-800 shadow-inner dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
        }`}
    >
        {icon} {isSidebarOpen && children}
    </button>
);

export default NavItem;
