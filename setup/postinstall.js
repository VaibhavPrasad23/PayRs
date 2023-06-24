const fs = require("fs");
const path = require("path");
const { DEBUG } = require("../config");
const setupDir = path.join(__dirname, "../tmp/");
const setupTXT = path.join(setupDir, "./setup.txt");

if (!fs.existsSync(setupDir)) {
    fs.mkdirSync(setupDir, { recursive: true });
}

fs.writeFileSync(setupTXT, "");

if (DEBUG) {
    fs.writeFileSync(setupTXT, "y");
}
