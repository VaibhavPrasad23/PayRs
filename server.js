"use strict";

const http = require("http");
const { Logger, LOG_SOURCE } = require("./config/logger");
const { DRY, LOGS_DIR } = require("./config");
const db = require("./src/datasource/mongodb");
const redis = require("./src/datasource/redis");
const endpoints = require("./src/api/endpoints");
const queue = require("./src/queue");

const httpServer = {
    start: (host, port) => {
        return new Promise((resolve, reject) => {
            const app = require("./src/app");
            const server = http.createServer(app);
            server.on("error", (err) => {
                if (err.code === "EADDRINUSE") {
                    Logger.error(
                        `The port ${port} is unavailable. Try changing the PORT environment variable.`
                    );
                }
                return reject(err);
            });
            Logger.debug(`Starting server...`);
            if (DRY) {
                port = Number(port) + 1;
                host = "localhost";
            }
            server.listen(port, host, async () => {
                Logger.info(`Listening on ${port}.`);
                Logger.info(`Log source: ${LOG_SOURCE}`);
                Logger.info(`Logs directory: ${LOGS_DIR}`);
                Logger.info(
                    `API docs at http://${host}:${port}${endpoints.apiDocs}`
                );
                resolve(server);
            });
        });
    },
};

Logger.info(`Environment: ${process.env.NODE_ENV}`);

db.connect()
    .then((res) => {
        Logger.info(
            `MongoDB connected with ${res.connections.length} connection(s)`
        );
        redis
            .connect()
            .then((res) => {
                Logger.info(`Redis connected with status: ${res}.`);
                Logger.info(`IORedis connected for queue.`);
                let q = queue.register({
                    connection: redis.ioredis(),
                });
                Logger.info(`${Object.keys(q).length} queue(s) registered`);
                const host = process.env.HOST || "localhost";
                const port = process.env.PORT || 8000;
                httpServer
                    .start(host, port)
                    .then((server) => {
                        if (DRY) {
                            Logger.info(`Closing server`);
                            server.close();
                            Logger.info(`Disconnecting redis`);
                            redis.disconnect();
                            Logger.info(`Disconnecting mongodb`);
                            db.disconnect();
                            Logger.info("Dry run completed successfully.");
                            return process.exit(0);
                        }
                        process.on("SIGINT", (e) => {
                            Logger.warn(e);
                            Logger.info(`Closing server`);
                            server.close();
                            Logger.info(`Disconnecting redis`);
                            redis.disconnect();
                            Logger.info(`Disconnecting mongodb`);
                            db.disconnect();
                            process.exit(0);
                        });
                        process.send("ready");
                    })
                    .catch((e) => {
                        Logger.error(e);
                        Logger.info(`Disconnecting redis`);
                        redis.disconnect();
                        Logger.info(`Disconnecting mongodb`);
                        db.disconnect();
                        if (DRY) {
                            Logger.error("Dry run failed. Check logs.");
                        }
                        process.exit(1);
                    });
            })
            .catch((e) => {
                Logger.error(e);
                Logger.info(`Disconnecting mongodb`);
                db.disconnect();
                Logger.debug(
                    "Is redis server running? Is correct redis configuration set in your environment?"
                );
                if (DRY) {
                    Logger.error("Dry run failed. Check logs.");
                }
                process.exit(1);
            });
    })
    .catch((e) => {
        Logger.error(e);
        Logger.debug(
            "Is mongodb server running? Is correct mongodb configuration set in your environment?"
        );
        if (DRY) {
            Logger.error("Dry run failed. Check logs.");
        }
        process.exit(1);
    });
