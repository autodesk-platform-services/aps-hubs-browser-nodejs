const express = require('express');
const session = require('cookie-session')
const PORT = process.env.PORT || 3000;

let app = express();
app.use(express.static('public'));
app.use(session({
    secret: process.env.SERVER_SESSION_SECRET,
    maxAge: 24 * 60 * 60 * 1000,
}));
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/hubs', require('./routes/hubs.js'));
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).send(err.message);
});
app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
