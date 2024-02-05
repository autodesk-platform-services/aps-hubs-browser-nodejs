import APS from 'forge-apis';
import { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } from './config.js';

const authClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, ['data:read'], true);

export function getAuthorizationUrl() {
    return authClient.generateAuthUrl();
}

export async function getCredentials(code) {
    const credentials = await authClient.getToken(code);
    return credentials;
}

export async function refreshCredentials(refreshToken) {
    const credentials = await authClient.refreshToken(refreshToken);
    return credentials;
}

export async function getUserProfile(credentials) {
    const resp = await new APS.UserProfileApi().getUserProfile(authClient, credentials);
    return resp.body;
}

export async function getHubs(credentials) {
    const resp = await new APS.HubsApi().getHubs(null, authClient, credentials);
    return resp.body.data;
}

export async function getProjects(hubId, credentials) {
    const resp = await new APS.ProjectsApi().getHubProjects(hubId, null, authClient, credentials);
    return resp.body.data;
}

export async function getProjectContents(hubId, projectId, folderId, credentials) {
    if (!folderId) {
        const resp = await new APS.ProjectsApi().getProjectTopFolders(hubId, projectId, authClient, credentials);
        return resp.body.data;
    } else {
        const resp = await new APS.FoldersApi().getFolderContents(projectId, folderId, null, authClient, credentials);
        return resp.body.data;
    }
}

export async function getItemVersions(projectId, itemId, credentials) {
    const resp = await new APS.ItemsApi().getItemVersions(projectId, itemId, null, authClient, credentials);
    return resp.body.data;
}