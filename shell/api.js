const inquirer = require("inquirer");
inquirer.registerPrompt("date", require("inquirer-date-prompt"));
const endpoints = require("../src/api/endpoints");
// process.env.DEBUG = "express:*"

const app = require("../src/app");
const request = require("supertest");
const { bearerAuthHeader } = require("../src/utils");
const Joi = require("joi");

// const handler = (stack) => {
//     return stack.filter((r) => ['router', 'bound dispatch'].includes(r.name))
//         .map((r) => {
//             if (r.route) return r.route
//             return handler(r.handle.stack)
//         })
// }

const handler2 = (ep) => {
    return Object.values(ep)
        .map((x) =>
            typeof x == "string"
                ? `${[x, undefined].includes(ep.SELF) ? "" : ep.SELF}${
                      !x.endsWith("/") ? x + "/" : x
                  }`
                : handler2(x)
        )
        .filter((x) => x);
};

module.exports = () => {
    const routes = [
        ...new Set(
            handler2(endpoints)
                .flat(10000)
                .filter((x) => x != "undefined" && x)
        ),
    ];
    const self = () =>
        inquirer
            .prompt([
                {
                    message: "Payr app key",
                    name: "appkey",
                    default: process.env.X_PAYR_APP_KEY,
                    validate: (t) =>
                        Joi.string().required().validate(t).error || true,
                },
                {
                    message: "Auth token",
                    name: "token",
                    default: process.env.TOKEN,
                    validate: (t) =>
                        Joi.string().required().validate(t).error || true,
                },
                {
                    type: "list",
                    message: "Select an endpoint",
                    name: "api",
                    choices: routes,
                },
                {
                    type: "list",
                    message: "Request method?",
                    name: "method",
                    choices: [
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS",
                    ],
                },
                {
                    message: "Query (key:value,key2:value2,...)",
                    name: "query",
                    default: "",
                },
                {
                    message: "Params (param:value,param2:value2,...)",
                    name: "params",
                    default: "",
                },
                {
                    message: "Body (json)",
                    name: "body",
                    default: "",
                },
            ])
            .then(async (ans) => {
                let method = ans.method.toLowerCase();
                let path = ans.api;
                if (ans.params) {
                    ans.params
                        .split(",")
                        .forEach((kv) =>
                            path.replace(
                                ":" + kv.split(":")[0],
                                kv.split[":"][1]
                            )
                        );
                }
                if (ans.query) {
                    path = path + "?";
                    console.log(ans.query.split(","));
                    ans.query
                        .split(",")
                        .forEach(
                            (kv) =>
                                (path += `${kv.split(":")[0]}=${
                                    kv.split(":")[1]
                                }&`)
                        );
                }
                let body = null;
                if (ans.body) {
                    console.log(ans.body);
                    body = JSON.parse(ans.body);
                }
                let headers = {
                    "x-payr-app-key": ans.appkey,
                    Authorization: bearerAuthHeader(ans.token),
                };
                let agent = request.agent(app);
                agent.set(headers);
                if (body) {
                    agent[method](path)
                        .send(body)
                        .then((res) => console.log(res.text || res.body))
                        .catch((err) => console.log(err))
                        .finally(self);
                } else {
                    agent[method](path)
                        .then((res) => console.log(res.text || res.body))
                        .catch((err) => console.log(err))
                        .finally(self);
                }
            });
    return self();
};
