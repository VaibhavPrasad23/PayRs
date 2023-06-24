"use strict";

const winston = require("winston");
require("winston-daily-rotate-file");
const { ElasticsearchTransport } = require("winston-elasticsearch");
const path = require("path");
const { Client } = require("@elastic/elasticsearch");
const {
    DRY,
    NO_ELASTIC,
    IS_DEVELOPMENT,
    IS_TEST,
    LOGS_DIR,
    IS_STAGING,
} = require("./index");
const safeStringify = require("fast-safe-stringify");
const os = require("os");

const LOG_SOURCE =
    process.env.LOG_SOURCE ||
    `${os.machine()}-${os.platform()}-${os.hostname()}`.replaceAll(" ", "-");

const elasticLog = () => {
    return new Client({
        node: process.env.ELASTICLOG_URI,
        auth: {
            username: process.env.ELASTICLOG_USER,
            password: process.env.ELASTICLOG_PASSWORD,
        },
    });
};

/**
 * Winston logging levels
 */
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    verbose: 5,
};

/**
 * Returns log level string
 * @returns {String} Log level
 */
const level = () => {
    if (DRY || IS_DEVELOPMENT || IS_TEST || IS_STAGING) {
        return "verbose";
    }
    return "info";
};

/**
 * Winston logging colors
 */
const colors = {
    error: "red",
    warn: "yellow",
    info: "cyan",
    http: "grey",
    debug: "green",
    verbose: "grey",
};

winston.addColors(colors);

const formatConsole = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp}  ${info.level}: ${info.message}`
    )
);

const formatRest = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    winston.format.printf(
        (info) => `${info.timestamp}  ${info.level}: ${info.message}`
    )
);

const formatError = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    winston.format.printf((info) => {
        let { timestamp, level, code, stack, message } = info;
        code = code ? ` ${code}` : "";
        message = stack || message;
        console.log(stack, message);
        return `${timestamp} ${level}${code}: ${message}`;
    })
);

const dailyTransportError = new winston.transports.DailyRotateFile({
    filename: path.resolve(LOGS_DIR, `error/${LOG_SOURCE}-%DATE%.log`),
    datePattern: `YYYY-MM-DD`,
    zippedArchive: false,
    maxSize: `10m`,
    maxFiles: `7d`,
    level: "error",
    handleExceptions: true,
    format: formatError,
});

const dailyTransportRest = new winston.transports.DailyRotateFile({
    filename: path.resolve(LOGS_DIR, `rest/${LOG_SOURCE}-%DATE%.log`),
    datePattern: `YYYY-MM-DD`,
    zippedArchive: false,
    maxSize: `10m`,
    maxFiles: `7d`,
    format: formatRest,
});

const transports = [
    new winston.transports.Console({
        format: formatConsole,
        handleExceptions: true,
    }),
];

if (process.env.ELASTICLOG_URI && !NO_ELASTIC) {
    let opts = {
        level: level(),
        indexPrefix: `${LOG_SOURCE}-log`,
        indexSuffixPattern: "YYYY-MM-DD",
        client: elasticLog(),
        source: `${LOG_SOURCE}-${os.hostname()}#${process.pid}`,
    };
    let esTransport = new ElasticsearchTransport(opts);
    esTransport.on("error", (err) => {
        console.error("ElasticLog Transport Error ", err);
    });
    esTransport.on("connection", () => {
        console.log("ElasticLog Transport Connected");
    });
    transports.push(esTransport);
}

transports.push(dailyTransportError, dailyTransportRest);

/**
 * Returns winston logger
 * @returns {winston.Logger} Winston logger
 */
const Logger = winston.createLogger({
    level: level(),
    levels,
    transports,
});

Logger.on("error", (error) => {
    console.error("Winston error", error);
});

Logger.format = winston.format.errors({ stack: true });

const wrapperFcn = (orgFcn, ...args) => {
    orgFcn(
        [`${DRY ? "[DRY]" : ""}`, ...args].reduce((previous, current) => {
            const replacer = (k, v) =>
                JSON.stringify(v.stack ? { stack: v.stack } : v);
            const space = 2;
            return `${previous ? previous + " " : ""}${
                typeof current === "string" || current instanceof String
                    ? current
                    : safeStringify(current, replacer, space)
            }`;
        }, "")
    );
};

/**
 *
 * @param {winston.Logger} loggerOrgObj
 * @returns {winston.Logger}
 */
const getWrappedLogger = (loggerOrgObj) => {
    const wrappedObject = Object.create(loggerOrgObj);
    Object.assign(wrappedObject, {
        error: wrapperFcn.bind(wrapperFcn, loggerOrgObj.error),
        warn: wrapperFcn.bind(wrapperFcn, loggerOrgObj.warn),
        info: wrapperFcn.bind(wrapperFcn, loggerOrgObj.info),
        http: wrapperFcn.bind(wrapperFcn, loggerOrgObj.http),
        verbose: wrapperFcn.bind(wrapperFcn, loggerOrgObj.verbose),
        debug: wrapperFcn.bind(wrapperFcn, loggerOrgObj.debug),
        silly: wrapperFcn.bind(wrapperFcn, loggerOrgObj.silly),
    });
    return { ...Logger, ...wrappedObject };
};

module.exports = { Logger: getWrappedLogger(Logger), elasticLog, LOG_SOURCE };
