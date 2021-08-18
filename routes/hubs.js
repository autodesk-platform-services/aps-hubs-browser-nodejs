const express = require('express');
const { authRefreshMiddleware, getHubs, getProjects, getProjectContents, getItemVersions } = require('../services/forge.js');

let router = express.Router();

router.use(authRefreshMiddleware);

router.get('/', async function (req, res, next) {
    try {
        const hubs = await getHubs(req.internalOAuthToken);
        res.json(hubs);
    } catch (err) {
        next(err);
    }
});

router.get('/:hub_id/projects', async function (req, res, next) {
    try {
        const projects = await getProjects(req.params.hub_id, req.internalOAuthToken);
        res.json(projects);
    } catch (err) {
        next(err);
    }
});

router.get('/:hub_id/projects/:project_id/contents', async function (req, res, next) {
    try {
        const contents = await getProjectContents(req.params.hub_id, req.params.project_id, req.query.folder_id, req.internalOAuthToken);
        res.json(contents);
    } catch (err) {
        next(err);
    }
});

router.get('/:hub_id/projects/:project_id/contents/:item_id/versions', async function (req, res, next) {
    try {
        const versions = await getItemVersions(req.params.project_id, req.params.item_id, req.internalOAuthToken);
        res.json(versions);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
