const morgan = require("morgan");
const { IS_TEST } = require("../../config");
const { Logger } = require("../../config/logger");

/**
  Override the stream method by telling
  Morgan to use our custom logger instead of the console.log.
 */
const stream = {
    write: (message) => Logger.http(message),
};

/** 
 Build the morgan middleware
 */
const morganMiddleware = morgan(
    ":method :url :status :response-time ms -size  :res[content-length] bytes - time :total-time[3] ms",
    { stream, skip: () => IS_TEST }
);

module.exports = { morganMiddleware };
