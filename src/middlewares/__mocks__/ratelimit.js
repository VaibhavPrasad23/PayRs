const rateLimit = require("express-rate-limit");

module.exports = {
    limitAdmin: rateLimit({
        windowMs: 2 * 1000,
        max: 0,
        statusCode: 429,
        message: { message: "Whoa! Slow down. Too frequent OTP requests!" },
    }),
    limitSendOTP: rateLimit({
        windowMs: 2 * 1000,
        max: 0,
        statusCode: 429,
        message: { message: "Whoa! Slow down. Too frequent OTP requests!" },
    }),
    limitPasswordLogin: rateLimit({
        windowMs: 1000,
        max: 0,
        statusCode: 429,
        message: {
            message: "Whoa! Slow down. Too frequent password attempts!",
        },
    }),
    limitTroubleshoot: rateLimit({
        windowMs: 10 * 1000,
        max: 0,
        statusCode: 429,
        message: {
            message: "Whoa! Slow down. Retry after 5-10 seconds.",
        },
    }),
    limitUpdate: rateLimit({
        windowMs: 2000,
        max: 0,
        statusCode: 429,
        message: {
            message: "Whoa! Slow down. Too frequent updates.",
        },
    }),
    limitUpload: rateLimit({
        windowMs: 2000,
        max: 0,
        statusCode: 429,
        message: {
            message: "Whoa! Slow down. Too frequent uploads.",
        },
    }),
    limitPublish: rateLimit({
        windowMs: 3000,
        max: 0,
        statusCode: 429,
        message: {
            message: "Whoa! Slow down. Too frequent publish requests.",
        },
    }),
};
