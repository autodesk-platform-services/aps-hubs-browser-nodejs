const { HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');
const { internalAuthClient } = require('./auth.js');

async function getHubs(token) {
    const resp = await new HubsApi().getHubs(null, internalAuthClient, token);
    return resp.body.data;
}

async function getProjects(hubId, token) {
    const resp = await new ProjectsApi().getHubProjects(hubId, null, internalAuthClient, token);
    return resp.body.data;
}

async function getProjectContents(hubId, projectId, folderId, token) {
    if (!folderId) {
        const resp = await new ProjectsApi().getProjectTopFolders(hubId, projectId, internalAuthClient, token);
        return resp.body.data;
    } else {
        const resp = await new FoldersApi().getFolderContents(projectId, folderId, null, internalAuthClient, token);
        return resp.body.data;
    }
}

async function getItemVersions(projectId, itemId, token) {
    const resp = await new ItemsApi().getItemVersions(projectId, itemId, null, internalAuthClient, token);
    return resp.body.data;
}

module.exports = {
    getHubs,
    getProjects,
    getProjectContents,
    getItemVersions
};
