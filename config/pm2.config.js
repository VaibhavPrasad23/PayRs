const index = process.argv.indexOf("-d");
let script = "./server.js";
if (index >= 0) {
    script = process.argv[index + 1] + " index.js";
}
module.exports = {
    apps: [
        {
            name: "api.mentor.payr",
            script,
            exec_mode: "cluster",
            instances: "MAX",
            cwd: ".",
            exp_backoff_restart_delay: 100,
            wait_ready: true,
            listen_timeout: 10000,
            restart_delay: 1000,
            max_memory_restart: "1G",
            error_file: (process.env.LOGS_DIR || "logs/") + "pm2/error.log",
            out_file: (process.env.LOGS_DIR || "logs/") + "pm2/output.log",
            pid_file: "tmp/process.pid",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
