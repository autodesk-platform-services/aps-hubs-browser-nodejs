const { SdkManagerBuilder } = require('@aps_sdk/autodesk-sdkmanager');
const { AuthenticationClient, Scopes, ResponseType } = require('@aps_sdk/authentication');
const { DataManagementClient } = require('@aps_sdk/data-management');
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL } = require('../config.js');

const sdk = SdkManagerBuilder.Create().build();
const authenticationClient = new AuthenticationClient(sdk);
const dataManagementClient = new DataManagementClient(sdk);

const service = module.exports = {};

service.getAuthorizationUrl = () => authenticationClient.authorize(APS_CLIENT_ID, ResponseType.Code, APS_CALLBACK_URL, [
    Scopes.Dataread,
    Scopes.Datacreate,
    Scopes.Viewablesread
]);

service.authCallbackMiddleware = async (req, res, next) => {
    const internalCredentials = await authenticationClient.getThreeLeggedTokenAsync(APS_CLIENT_ID, APS_CLIENT_SECRET, req.query.code, APS_CALLBACK_URL);
    const publicCredentials = await authenticationClient.getRefreshTokenAsync(APS_CLIENT_ID, APS_CLIENT_SECRET, internalCredentials.refresh_token, [
        Scopes.Viewablesread
    ]);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    next();
};

service.authRefreshMiddleware = async (req, res, next) => {
    const { refresh_token, expires_at } = req.session;
    if (!refresh_token) {
        res.status(401).end();
        return;
    }

    if (expires_at < Date.now()) {
        const internalCredentials = await authenticationClient.getRefreshTokenAsync(APS_CLIENT_ID, APS_CLIENT_SECRET, refresh_token, [
            Scopes.Dataread,
            Scopes.Datacreate
        ]);
        const publicCredentials = await authenticationClient.getRefreshTokenAsync(APS_CLIENT_ID, internalCredentials.refresh_token, [
            Scopes.Viewablesread
        ]);
        req.session.public_token = publicCredentials.access_token;
        req.session.internal_token = internalCredentials.access_token;
        req.session.refresh_token = publicCredentials.refresh_token;
        req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
    }
    req.internalOAuthToken = {
        access_token: req.session.internal_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000),
    };
    req.publicOAuthToken = {
        access_token: req.session.public_token,
        expires_in: Math.round((req.session.expires_at - Date.now()) / 1000),
    };
    next();
};

service.getUserProfile = async (token) => {
    const resp = await authenticationClient.getUserinfoAsync(token.access_token);
    return resp;
};

service.getHubs = async (token) => {
    const resp = await dataManagementClient.GetHubsAsync(token.access_token);
    return resp.data;
};

service.getProjects = async (hubId, token) => {
    const resp = await dataManagementClient.GetHubProjectsAsync(token.access_token, hubId);
    return resp.data;
};

service.getProjectContents = async (hubId, projectId, folderId, token) => {
    if (!folderId) {
        const resp = await dataManagementClient.GetProjectTopFoldersAsync(token.access_token, hubId, projectId);
        return resp.data;
    } else {
        const resp = await dataManagementClient.GetFolderContentsAsync(token.access_token, projectId, folderId);
        return resp.data;
    }
};

service.getItemVersions = async (projectId, itemId, token) => {
    const resp = await dataManagementClient.GetItemVersionsAsync(token.access_token, projectId, itemId);
    return resp.data;
};
