const { morganMiddleware } = require("./morgan");
const { appKey, authenticate } = require("./auth");
const rateLimit = require("./ratelimit");

module.exports = {
    morganMiddleware,
    appKey,
    authenticate,
    ...rateLimit,
    updateApp: (req, res) => {
        return res.status(400).json({
            message: "Please update your app to the latest version for this.",
        });
    },
};
