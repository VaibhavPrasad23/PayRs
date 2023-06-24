const ioredis = require("ioredis");
const { createClient } = require("redis");

const { Logger } = require("../../config/logger");

const REDISURI = process.env.REDISURI || "redis://localhost:6379/0";

const client = createClient({
    url: REDISURI,
});

let ioconnection = null;

module.exports = {
    connect: async () => {
        Logger.debug("Trying redis connection...");
        let conn = await new Promise((resolve, reject) => {
            client.on("error", (err) => {
                Logger.error("Redis Client Error", err);
                reject(err);
            });
            client.connect();
            ioconnection = new ioredis(REDISURI, {
                maxRetriesPerRequest: 1,
                enableReadyCheck: false,
            });
            ioconnection.on("error", (err) => {
                return reject(err);
            });
            ioconnection.on("connect", async () => {
                return resolve(ioconnection);
            });
        });
        return conn.status;
    },
    disconnect: async () => {
        try {
            return await client.disconnect();
        } catch {
            return undefined;
        }
    },
    redis: () => client,
    ioredis: () => ioconnection,
};
