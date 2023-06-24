const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { ioredis } = require("../datasource/redis");
const ms = require("ms");

module.exports = {
    limitAdmin: rateLimit({
        windowMs: ms("5s"),
        max: 4,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: { message: "Whoa! Slow down admin. Retry after 5s." },
    }),
    limitSendOTP: rateLimit({
        windowMs: ms("5s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: { message: "Whoa! Slow down. Retry after 5s." },
    }),
    limitPasswordLogin: rateLimit({
        windowMs: ms("2s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: {
            message: "Whoa! Slow down. Too frequent password attempts.",
        },
    }),
    limitTroubleshoot: rateLimit({
        windowMs: ms("5s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: {
            message: "Whoa! Slow down. Retry after 5 seconds.",
        },
    }),
    limitUpdate: rateLimit({
        windowMs: ms("2s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: {
            message: "Whoa! Slow down. Too frequent updates.",
        },
    }),
    limitUpload: rateLimit({
        windowMs: ms("2s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: {
            message: "Whoa! Slow down. Too frequent uploads.",
        },
    }),
    limitPublish: rateLimit({
        windowMs: ms("3s"),
        max: 1,
        statusCode: 429,
        store: new RedisStore({
            sendCommand: (...args) => ioredis().call(...args),
        }),
        message: {
            message: "Whoa! Slow down. Too frequent publishes.",
        },
    }),
};
