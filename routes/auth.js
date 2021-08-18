const express = require('express');
const { getAuthorizationUrl, authCallbackMiddleware, authRefreshMiddleware, getUserProfile } = require('../services/forge.js');

let router = express.Router();

router.get('/login', function (req, res) {
    res.redirect(getAuthorizationUrl());
});

router.get('/logout', function (req, res) {
    req.session = null;
    res.redirect('/');
});

router.get('/callback', authCallbackMiddleware, function (req, res) {
    res.redirect('/');
});

router.get('/token', authRefreshMiddleware, function (req, res) {
    res.json(req.publicOAuthToken);
});

router.get('/profile', authRefreshMiddleware, async function (req, res, next) {
    try {
        const profile = await getUserProfile(req.internalOAuthToken);
        res.json({ name: `${profile.firstName} ${profile.lastName}` });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
