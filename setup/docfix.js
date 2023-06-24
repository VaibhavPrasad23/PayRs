let fs = require("fs");
let path = require("path");
let index = process.argv.indexOf("-d");
let file = path.join(__dirname, "../build/docs/index.html");
if (index >= 0) {
    file = process.argv[index + 1] + "/index.html";
}

fs.readFile(file, (err, o) => {
    if (err) {
        console.error(`No index.html at ${file}`);
        return process.exit(1);
    }
    let cont = o.toString();
    fs.writeFile(
        file,
        cont.replace(
            "</head>",
            `<style>pre{ background:black; color:white }
		td{ word-break:break-all; font-size:12px; font-weight:bold; }</style></head>`
        ),
        (err) => {
            if (err) {
                console.warn(`Error in writing ${file}`, err);
                return process.exit(1);
            }
            console.log("API docs generated.");
            return process.exit(0);
        }
    );
});
