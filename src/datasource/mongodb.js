const mongoose = require("mongoose");
const { Logger } = require("../../config/logger");
const { DEBUG } = require("../../config");
const ms = require("ms");

mongoose.set("debug", DEBUG);

module.exports = {
    connect: async () => {
        Logger.debug("Trying mongodb connection...");
        return await mongoose.connect(
            process.env.MONGOURI || "mongodb://localhost:27017/payrdefaultDB",
            {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                autoIndex: false,
                connectTimeoutMS: ms(process.env.MONGO_TIMEOUT || "5s"),
                serverSelectionTimeoutMS: ms(process.env.MONGO_TIMEOUT || "5s"),
            }
        );
    },
    disconnect: async () => await mongoose.disconnect(),
};
