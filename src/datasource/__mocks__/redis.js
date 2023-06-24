const redis = require("redis");
const { promisify } = require("util");

let client = redis.createClient({
    url: process.env.REDIS_URI,
    connect_timeout: 15000,
    no_ready_check: true,
    retry_unfulfilled_commands: true,
    retry_strategy: function (options) {
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error("Redis retries exhausted");
        }
        if (options.attempt > 10) {
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
    },
});
const copy = async (...args) => {
    let type = await promisify(redisClient.type).bind(redisClient)(args[0]);
    switch (type) {
        case "zset":
            {
                let dat = await promisify(redisClient.zrange).bind(redisClient)(
                    args[0],
                    0,
                    -1,
                    "withscores"
                );
                dat = await promisify(redisClient.zadd).bind(redisClient)(
                    args[1],
                    dat.reverse()
                );
            }
            break;
        case "set":
            {
                let dat = await promisify(redisClient.smembers).bind(
                    redisClient
                )(args[0]);
                await promisify(redisClient.sadd).bind(redisClient)(
                    args[1],
                    dat
                );
            }
            break;
        case "list":
            {
                let dat = await promisify(redisClient.lrange).bind(redisClient)(
                    args[0],
                    0,
                    -1
                );
                await promisify(redisClient.rpush).bind(redisClient)(
                    args[1],
                    dat
                );
            }
            break;
        case "string":
            {
                let dat = await promisify(redisClient.get).bind(redisClient)(
                    args[0]
                );
                await promisify(redisClient.set).bind(redisClient)(
                    args[1],
                    dat
                );
            }
            break;
        default:
            return 0;
    }
    return 1;
};

module.exports = {
    redis: () => client,
};
