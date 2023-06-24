/**
 * Config keys for the whole application (enviroment variables particularly)
 */
const path = require("path");
const { ENV } = require("../src/utils/strings");

require("dotenv").config({
    path: path.resolve(__dirname, `../.env`),
});

Array.prototype.last = function (minus = 0) {
    return this[this.length - 1 - (minus < 0 ? 0 : minus)];
};

process.send = process.send || (() => {});

let LOGS_DIR = process.env.LOGS_DIR || "logs/";

if (
    !(
        LOGS_DIR.startsWith("/") ||
        "a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z"
            .split(",")
            .map((alp) => `${alp}:`)
            .some((windrive) => LOGS_DIR.toLowerCase().startsWith(windrive))
    )
) {
    LOGS_DIR = path.resolve(__dirname, `../${LOGS_DIR}`);
}

module.exports = {
    DRY: process.argv.includes("--dry-run"),
    NO_ELASTIC: process.argv.includes("--no-elastic"),
    IS_PRODUCTION: process.env.NODE_ENV === ENV.production,
    IS_STAGING: process.env.NODE_ENV === ENV.staging,
    IS_TEST: process.env.NODE_ENV === ENV.test,
    IS_DEVELOPMENT: process.env.NODE_ENV
        ? process.env.NODE_ENV === ENV.development
        : true,
    PHONES_BLACKLIST: process.env.PHONES_BLACKLIST
        ? process.env.PHONES_BLACKLIST.split(",")
        : [],
    DEBUG:
        !process.argv.includes("--no-debug") &&
        process.env.NODE_ENV !== ENV.production,
    CORS_ORIGINS: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : [],
    LOGS_DIR,
};
