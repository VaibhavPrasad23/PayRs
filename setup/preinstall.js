const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "../");

const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");

const example = fs.readFileSync(envExamplePath, {
    encoding: "utf-8",
});

if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, example);
} else {
    const content = fs.readFileSync(envPath).toString();
    const excontent = fs.readFileSync(envExamplePath).toString();
    const kvs = excontent
        .split("\n")
        .filter((k) => k)
        .map((k) => k.split("="))
        .filter((kv) => !content.includes(kv[0]));
    fs.appendFileSync(
        envPath,
        "\n\n" + kvs.map((kv) => kv.join("=")).join("\n")
    );
}
