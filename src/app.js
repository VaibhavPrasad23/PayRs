const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const requestIp = require("request-ip");

const ENDPOINT = require("./api/endpoints");
const {
    appKey,
    morganMiddleware,
    authenticate,
    limitAdmin,
} = require("./middlewares");
const { CORS_ORIGINS, Logger } = require("../config");

const app = express();

app.set("trust proxy", true);

app.use(
    cors({
        origin: CORS_ORIGINS,
        credentials: true,
    })
);

app.use(compression());
app.use(helmet());
app.use(hpp());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(morganMiddleware);

app.use(requestIp.mw());

app.use(
    ENDPOINT.apiDocs,
    (req, res, next) => {
        res.setHeader(
            "Content-Security-Policy",
            "script-src 'self' 'unsafe-eval'"
        );
        next();
    },
    express.static("build/docs")
);

app.get(ENDPOINT.status, (_, res) => {
    return res.send("OK");
});

app.get(ENDPOINT.my_ip, (req, res) => {
    return res.json({
        IPAddress: req.ip,
    });
});

app.use(
    ENDPOINT.admin.SELF,
    limitAdmin,
    appKey,
    authenticate({ adminOnly: true }),
    require("./api/admin/router")
);

app.use(ENDPOINT.v1.ROOT, appKey, require("./api/v1/router"));

app.use(ENDPOINT.v1.SELF, appKey, require("./api/v1/router"));

app.use("*", (_, res) => {
    return res.status(404).json({ message: "API not found." });
});

app.use((err, req, res, next) => {
    if (err) {
        if (err.type == "entity.parse.failed") {
            return res.status(400).json({ message: "Bad request data." });
        }
        Logger.error(err);
        res.status(500).json({ message: "An internal error occurred." });
    } else {
        next();
    }
});

module.exports = app;
