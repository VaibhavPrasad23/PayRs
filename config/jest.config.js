require("dotenv");
const path = require("path");
const root = (filePath) => path.join(__dirname, `../${filePath}`);

const config = {
    verbose: true,
    rootDir: root("./test"),
    cacheDirectory: root("./tmp/jest"),
    coverageDirectory: root("./test/unit_test/coverage"),
    testRegex: "[a-zA-Z0-9]+(.test.js)$",
    forceExit: true,
    testEnvironment: "node",
    detectOpenHandles: true,
    testTimeout: Number(process.env.TEST_TIMEOUT || 2000),
    globals: {
        __DEV__: true,
        __MONGOREPL__: [],
        __MONGOD__: [],
    },
    testSequencer: root("./test/unit_test/testSequencer.js"),
    setupFiles: [root("./test/unit_test/setupTests.js")],
    // globalSetup: root("./test/init.js"),
    globalTeardown: root("./test/unit_test/teardown.js"),
    collectCoverageFrom: [],
    coveragePathIgnorePatterns: ["/node_modules/", "/logs/", "/testlogs/"],
};

module.exports = config;
