require("./../config");
const fs = require("fs");
const path = require("path");
const { Logger } = require("../config/logger");

const db = require("./../src/datasource/mongodb");
const redis = require("./../src/datasource/redis");

const root = (filePath) => path.join(__dirname, `../${filePath}`);

const commands = fs.readdirSync(root("./shell"));

let cmd = commands.find((cmnd) =>
    process.argv.some((arg) => arg.replace("--", "") == cmnd.replace(".js", ""))
);

if (!cmd || cmd == __filename.split("/").last()) {
    Logger.error("Command not found.");
    return process.exit(1);
}

db.connect()
    .then((res) => {
        Logger.info(
            `MongoDB connected with ${res.connections.length} connections`
        );
        redis
            .connect()
            .then((res) => {
                Logger.info(`Redis connected with status: ${res}.`);
                try {
                    require(`./${cmd}`)();
                } catch (e) {
                    Logger.error(e);
                    process.exit(1);
                }
            })
            .catch((e) => {
                Logger.error(e);
                Logger.info(`Disconnecting mongodb`);
                db.disconnect();
                Logger.debug(
                    "Is redis server running? Is correct redis configuration set in your environment?"
                );
                process.exit(1);
            });
    })
    .catch((e) => {
        Logger.error(e);
        Logger.debug(
            "Is mongodb server running? Is correct mongodb configuration set in your environment?"
        );
        process.exit(1);
    });
