
import React, { useState } from 'react';
import Icon from '../ui/Icon';

type SettingTab = 'profile' | 'company' | 'preferences' | 'billing';

const SettingsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SettingTab>('profile');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div>
                        <h2 className="text-xl font-bold text-[#424242]">Profile Settings</h2>
                        <p className="text-gray-600 mt-1">Manage your personal information.</p>
                        <div className="mt-6 p-8 border rounded-lg bg-gray-50 text-center">
                            <p className="text-gray-700">Clerk User Profile Management Component would be rendered here.</p>
                            <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md">Manage Profile</button>
                        </div>
                    </div>
                );
            case 'company':
                return (
                     <div>
                        <h2 className="text-xl font-bold text-[#424242]">Company Settings</h2>
                        <p className="text-gray-600 mt-1">This info will be used to brand exported documents.</p>
                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="font-medium text-sm text-gray-700">Company Name</label>
                                <input type="text" defaultValue="PW Surveyors" className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#29B6F6]" />
                            </div>
                             <div>
                                <label className="font-medium text-sm text-gray-700">Company Logo</label>
                                <div className="mt-1 flex items-center space-x-4 p-4 border-2 border-dashed rounded-md">
                                    <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center font-bold text-[#0D47A1]">PW</div>
                                    <button className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Change</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'preferences':
                 return (
                     <div>
                        <h2 className="text-xl font-bold text-[#424242]">Preferences</h2>
                        <p className="text-gray-600 mt-1">Adjust your default settings for new projects.</p>
                         <div className="mt-6 space-y-4">
                            <div>
                                <label className="font-medium text-sm text-gray-700">Default Currency</label>
                                <select defaultValue="KES" className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#29B6F6]">
                                    <option value="KES">KES - Kenyan Shilling</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-medium text-sm text-gray-700">Default Measurement System</label>
                                <select defaultValue="Metric" className="w-full mt-1 p-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#29B6F6]">
                                    <option>Metric</option>
                                    <option>Imperial</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'billing':
                 return (
                     <div>
                        <h2 className="text-xl font-bold text-[#424242]">Billing</h2>
                        <p className="text-gray-600 mt-1">Manage your subscription and payment methods.</p>
                         <div className="mt-6 p-8 border rounded-lg bg-gray-50 text-center">
                            <h3 className="text-lg font-semibold text-gray-800">Billing &amp; Subscription Management</h3>
                            <p className="mt-2 text-gray-600">This section is under construction and will be available soon.</p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const TabButton: React.FC<{tab: SettingTab; label: string; icon: 'user' | 'folder' | 'settings' | 'document'}> = ({tab, label, icon}) => (
        <button 
            onClick={() => setActiveTab(tab)}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-left font-medium transition-colors ${activeTab === tab ? 'bg-[#0D47A1] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
        >
            <Icon name={icon} className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex flex-1">
                {/* Vertical Tab Navigation */}
                <div className="w-64 p-4 border-r border-gray-200">
                    <div className="space-y-2">
                        <TabButton tab="profile" label="Profile" icon="user" />
                        <TabButton tab="company" label="Company" icon="folder" />
                        <TabButton tab="preferences" label="Preferences" icon="settings" />
                        <TabButton tab="billing" label="Billing" icon="document" />
                    </div>
                </div>
                {/* Content Area */}
                <div className="flex-1 p-8">
                    {renderTabContent()}
                </div>
            </div>
             {/* Save Button Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-xl">
                 <button className="bg-[#29B6F6] text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-[#039BE5] transition-colors">Save Changes</button>
            </div>
        </div>
    );
};

export default SettingsView;
