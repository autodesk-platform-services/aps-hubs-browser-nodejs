async function getJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
        alert('Could not load tree data. See console for more details.');
        console.error(await resp.text());
        return [];
    }
    return resp.json();
}

function createTreeNode(id, text, icon, children = false, selectable = false) {
    return { id, text, children, itree: { icon, state: { selectable } } };
}

async function getHubs() {
    const hubs = await getJSON('/api/hubs');
    return hubs.map(hub => createTreeNode(`hub|${hub.id}`, hub.attributes.name, 'icon-hub', true));
}

async function getProjects(hubId) {
    const projects = await getJSON(`/api/hubs/${hubId}/projects`);
    return projects.map(project => createTreeNode(`project|${hubId}|${project.id}`, project.attributes.name, 'icon-project', true));
}

async function getContents(hubId, projectId, folderId = null) {
    const contents = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents` + (folderId ? `?folder_id=${folderId}` : ''));
    return contents.map(item => {
        if (item.type === 'folders') {
            return createTreeNode(`folder|${hubId}|${projectId}|${item.id}`, item.attributes.displayName, 'icon-my-folder', true);
        } else {
            return createTreeNode(`item|${hubId}|${projectId}|${item.id}`, item.attributes.displayName, 'icon-item', true);
        }
    });
}

async function getVersions(hubId, projectId, itemId) {
    const versions = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents/${itemId}/versions`);
    return versions.map(version => createTreeNode(`version|${version.id}`, version.attributes.createTime, 'icon-version', false, true));
}

export function initTree(selector, onNodeSelected, onNodeDeselected) {
    // See http://inspire-tree.com
    const tree = new InspireTree({
        selection: {
            multiple: true
        },
        data: function (node) {
            if (!node || !node.id) {
                return getHubs();
            } else {
                const tokens = node.id.split('|');
                switch (tokens[0]) {
                    case 'hub': return getProjects(tokens[1]);
                    case 'project': return getContents(tokens[1], tokens[2]);
                    case 'folder': return getContents(tokens[1], tokens[2], tokens[3]);
                    case 'item': return getVersions(tokens[1], tokens[2], tokens[3]);
                    default: return [];
                }
            }
        }
    });
    tree.on('node.selected', function (node) {
        const tokens = node.id.split('|');
        if (tokens[0] === 'version') {
            onNodeSelected(tokens[1]);
        }
    });
    tree.on('node.deselected', function (node) {
        const tokens = node.id.split('|');
        if (tokens[0] === 'version') {
            onNodeDeselected(tokens[1]);
        }
    });
    return new InspireTreeDOM(tree, { target: selector });
}
