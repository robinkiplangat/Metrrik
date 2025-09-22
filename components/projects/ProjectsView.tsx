
import React, { useState, useMemo } from 'react';
import type { Project } from '../../types';
import Icon from '../ui/Icon';

type SortableKeys = keyof Pick<Project, 'name' | 'client' | 'lastModified'>;

const getStatusClasses = (status: Project['status']) => {
    switch (status) {
        case 'Draft': return 'bg-gray-200 text-gray-800';
        case 'In Review': return 'bg-yellow-200 text-yellow-800';
        case 'Completed': return 'bg-green-200 text-green-800';
        default: return 'bg-gray-200 text-gray-800';
    }
}

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onSelectProject }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'lastModified', direction: 'descending' });

    const sortedAndFilteredProjects = useMemo(() => {
        let filtered = projects.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.client.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        return filtered;
    }, [projects, searchTerm, sortConfig]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full flex flex-col space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="chat" className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by project or client..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#29B6F6] focus:border-[#29B6F6] transition"
                    />
                </div>
                <div>
                    <select 
                        onChange={(e) => requestSort(e.target.value as SortableKeys)}
                        defaultValue="lastModified"
                        className="border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-[#29B6F6] focus:border-[#29B6F6] transition"
                    >
                        <option value="lastModified">Sort by Last Modified</option>
                        <option value="name">Sort by Project Name</option>
                        <option value="client">Sort by Client Name</option>
                    </select>
                </div>
            </div>

            {/* Project List */}
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 sticky top-0 bg-white z-10">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Project Name</th>
                            <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Client</th>
                            <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Last Modified</th>
                            <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider">Status</th>
                            <th className="p-3 text-sm font-semibold text-[#616161] tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedAndFilteredProjects.map(project => (
                            <tr key={project.id} onClick={() => onSelectProject(project)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="p-3 font-medium text-[#424242]">{project.name}</td>
                                <td className="p-3 text-gray-600">{project.client}</td>
                                <td className="p-3 text-gray-600">{new Date(project.lastModified).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClasses(project.status)}`}>
                                        {project.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <details className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                        <summary className="list-none cursor-pointer p-1 rounded-full hover:bg-gray-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                        </summary>
                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                                            <div className="py-1" role="menu" aria-orientation="vertical">
                                                <a href="#" onClick={(e) => { e.preventDefault(); alert('Renaming...'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Rename</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); alert('Duplicating...'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">Duplicate</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); alert('Deleting...'); }} className="block px-4 py-2 text-sm text-red-700 hover:bg-red-50" role="menuitem">Delete</a>
                                            </div>
                                        </div>
                                    </details>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {sortedAndFilteredProjects.length === 0 && (
                     <div className="text-center py-16">
                        <h3 className="text-lg font-semibold text-[#424242]">No projects found.</h3>
                        <p className="text-[#616161]">Try adjusting your search or filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectsView;
