import { VanillaTreeView } from 'https://unpkg.com/simple-treeview/dist/treeview.vanilla.js';

export function initTree(container, onSelectionChanged) {
    async function getHubs() {
        const resp = await fetch('/api/hubs');
        const hubs = await resp.json();
        return hubs.map(hub => ({
            id: `hub|${hub.id}`,
            label: hub.attributes.name,
            icon: { classes: ['fas', 'fa-cloud'] },
            state: 'collapsed'
        }));
    }

    async function getProjects(hubId) {
        const resp = await fetch(`/api/hubs/${hubId}/projects`);
        const projects = await resp.json();
        return projects.map(project => ({
            id: `project|${hubId}|${project.id}`,
            label: project.attributes.name,
            icon: { classes: ['fas', 'fa-building'] },
            state: 'collapsed'
        }));
    }

    async function getProjectContents(hubId, projectId, folderId) {
        let url = `/api/hubs/${hubId}/projects/${projectId}/contents`;
        if (folderId) {
            url += `?folder_id=${folderId}`;
        }
        const resp = await fetch(url);
        const contents = await resp.json();
        return contents.map(item => {
            if (item.type === 'folders') {
                return {
                    id: `folder|${hubId}|${projectId}|${item.id}`,
                    label: item.attributes.displayName,
                    icon: { classes: ['fas', 'fa-folder'] },
                    state: 'collapsed'
                };
            } else {
                return {
                    id: `item|${hubId}|${projectId}|${item.id}`,
                    label: item.attributes.displayName,
                    icon: { classes: ['far', 'fa-file'] },
                    state: 'collapsed'
                };
            }
        });
    }

    async function getItemVersions(hubId, projectId, itemId) {
        const resp = await fetch(`/api/hubs/${hubId}/projects/${projectId}/contents/${itemId}/versions`);
        const versions = await resp.json();
        return versions.map(version => ({
            id: version.id,
            label: version.attributes.displayName,
            icon: { classes: ['far', 'fa-clock'] }
        }));
    }

    return new VanillaTreeView(container, {
        provider: {
            async getChildren(id) {
                if (!id) {
                    return getHubs();
                }
                const tokens = id.split('|');
                switch (tokens[0]) {
                    case 'hub':
                        return getProjects(tokens[1]);
                    case 'project':
                        return getProjectContents(tokens[1], tokens[2], null);
                    case 'folder':
                        return getProjectContents(tokens[1], tokens[2], tokens[3]);
                    case 'item':
                        return getItemVersions(tokens[1], tokens[2], tokens[3]);
                    default:
                        return [];
                }
            }
        },
        onSelectionChanged: onSelectionChanged
    });
}
