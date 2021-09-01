const { AuthClientThreeLegged, UserProfileApi, HubsApi, ProjectsApi, FoldersApi, ItemsApi } = require('forge-apis');

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL } = process.env;
if (!FORGE_CLIENT_ID || !FORGE_CLIENT_SECRET || !FORGE_CALLBACK_URL) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
const INTERNAL_TOKEN_SCOPES = ['data:read'];
const PUBLIC_TOKEN_SCOPES = ['viewables:read'];

const internalAuthClient = new AuthClientThreeLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);
const publicAuthClient = new AuthClientThreeLegged(FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, FORGE_CALLBACK_URL, PUBLIC_TOKEN_SCOPES);

function getAuthorizationUrl() {
    return internalAuthClient.generateAuthUrl();
}

async function authCallbackMiddleware(req, res, next) {
    const internalCredentials = await internalAuthClient.getToken(req.query.code);
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
}

async function authRefreshMiddleware(req, res, next) {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const internalCredentials = await internalAuthClient.refreshToken({ refresh_token });
        const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
        req.session.public_token = publicCredentials.access_token;
        req.session.internal_token = internalCredentials.access_token;
        req.session.refresh_token = publicCredentials.refresh_token;
        req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    }
    req.internalOAuthToken = {
        access_token: req.session.internal_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    req.publicOAuthToken = {
        access_token: req.session.public_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
    };
    next();
}

async function getUserProfile(token) {
    const resp = await new UserProfileApi().getUserProfile(internalAuthClient, token);
    return resp.body;
}

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
    getAuthorizationUrl,
    authCallbackMiddleware,
    authRefreshMiddleware,
    getUserProfile,
    getHubs,
    getProjects,
    getProjectContents,
    getItemVersions
};
