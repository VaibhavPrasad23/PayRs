"use strict";

/**
 * Based on jest-apidoc by github.com/twentyfourg,
 * extended by github.com/ranjanistic
 */

const fs = require("fs");
const { outFolder } = require("./../../docwriter.json");

// prettier-ignore
const baseSuccessfulExample =
    `@apiSuccessExample Success-Response:
   HTTP/2 {{status}}{{response}}`;

// prettier-ignore
const baseErrorExample =
    `@apiErrorExample {json} Error-Response:
   HTTP/2 {{status}}{{response}}`;

// prettier-ignore
const baseApiDoc =
    `/**
   @api {{{method}}} {{route}} {{routeTitle}}
   @apiName {{apiName}}
   @apiGroup {{apiGroup}}

   {{params}}
   {{successResponses}}
   {{errorResponses}}
 */
 `;

const getDocNameFromTestName = (currentTestName, query = {}) => {
    const parts = currentTestName.split(" ");
    let path = parts[2];
    Object.keys(query).forEach(
        (key, i) => (path += (i < 1 ? "?" : "&") + `${key}=${query[key]}`)
    );
    return path;
};

const getGroupNameFromTestName = (currentTestName) => {
    const parts = currentTestName.split(" ");
    return parts[0].replace(".routes", "").replace("-", " ");
};

const getRouteTitleFromTestName = (testName) => {
    const parts = testName.split(" ");
    return parts.slice(3).join(" ");
};
const getParamType = (paramValue) => {
    if (Array.isArray(paramValue) && paramValue.length > 0) {
        return `${typeof paramValue[0]}[]`;
    }

    if (paramValue && paramValue.constructor) {
        const { name } = paramValue.constructor;
        return name.toLowerCase();
    }

    return typeof paramValue;
};

const createParams = ({ params = {}, body = {}, query = {}, headers = {} }) => {
    const paramsKeys = Object.keys(params);
    const bodyKeys = Object.keys(body);
    const queryKeys = Object.keys(query);
    const headersKeys = Object.keys(headers);

    if (![...paramsKeys, ...bodyKeys, ...queryKeys, ...headersKeys].length) {
        return "";
    }

    let paramString = "";

    headersKeys.forEach((key) => {
        const paramType = getParamType(headers[key]);
        paramString += `  @apiHeader {${paramType}} ${key} ${JSON.stringify(
            headers[key]
        )}\n`;
    });

    paramsKeys.forEach((key) => {
        const paramType = getParamType(params[key]);
        paramString += `  @apiParam {${paramType}} ${key} ${JSON.stringify(
            params[key]
        )}\n`;
    });

    bodyKeys.forEach((key) => {
        const paramType = getParamType(body[key]);
        paramString += `  @apiBody {${paramType}} ${key} ${JSON.stringify(
            body[key]
        )}\n`;
    });

    queryKeys.forEach((key) => {
        const paramType = getParamType(query[key]);
        paramString += `  @apiQuery {${paramType}} ${key} ${JSON.stringify(
            query[key]
        )}\n`;
    });

    return `\n${paramString}`;
};

const createResponse = (response) => {
    if (!response) {
        return "";
    }

    delete response.status;
    const jsonResponse = JSON.stringify(response, null, 2);
    return `\n  ${jsonResponse}\n`;
};

const getRouteToWrite = (currentTestName, query = {}) => {
    const parts = currentTestName.split(" ");
    return `${parts[1]} ${getDocNameFromTestName(currentTestName, query)}`;
};

const apiCalls = {};

const populateUndefined = ({ method, route, status }) => {
    if (!apiCalls[route]) {
        apiCalls[route] = {};
    }

    if (!apiCalls[route][method]) {
        apiCalls[route][method] = {
            params: {},
            body: {},
            query: {},
            headers: {},
            statuses: {},
        };
        apiCalls[route][method].statuses = {};
    }

    if (!apiCalls[route][method].statuses[status]) {
        apiCalls[route][method].statuses[status] = {
            response: {},
        };
    }
};

const setApiResponse = ({ response, params = {}, body = {}, query = {} }) => {
    if (!process.env.APIDOC) return;
    const jestState = expect.getState();
    let { currentTestName } = jestState;
    currentTestName = String(currentTestName);
    let method = response.request.method;
    let headers = response.request.header;
    const apiGroup = getGroupNameFromTestName(currentTestName);
    const docName = getDocNameFromTestName(currentTestName, query);
    const apiName = `${method.toUpperCase()} ${docName}`;
    const routeTitle = getRouteTitleFromTestName(currentTestName);
    const routeToWrite = getRouteToWrite(currentTestName, query);
    populateUndefined({
        method,
        route: routeToWrite,
        status: response.statusCode,
    });

    const { params: currentParams } = apiCalls[routeToWrite][method];
    const { body: currentBody } = apiCalls[routeToWrite][method];
    const { query: currentQuery } = apiCalls[routeToWrite][method];
    const { headers: currentHeaders } = apiCalls[routeToWrite][method];
    const { response: currentResponse } =
        apiCalls[routeToWrite][method].statuses[response.statusCode];

    const paramsToWrite =
        currentParams &&
        Object.keys(currentParams).length > Object.keys(params).length
            ? currentParams
            : params;
    const bodyToWrite =
        currentBody &&
        Object.keys(currentBody).length > Object.keys(body).length
            ? currentBody
            : body;
    const queryToWrite =
        currentQuery &&
        Object.keys(currentQuery).length > Object.keys(query).length
            ? currentQuery
            : query;

    const headersToWrite =
        currentHeaders &&
        Object.keys(currentHeaders).length > Object.keys(headers).length
            ? currentHeaders
            : headers;
    delete response.body._test;
    const responseToWrite =
        currentResponse &&
        Object.keys(currentResponse).length > Object.keys(response.body).length
            ? currentResponse
            : response.body; // @todo check response size too

    apiCalls[routeToWrite][method] = {
        docName,
        apiGroup,
        apiName,
        routeTitle,
        params: paramsToWrite,
        body: bodyToWrite,
        query: queryToWrite,
        headers: headersToWrite,
        statuses: {
            ...apiCalls[routeToWrite][method].statuses,
            [response.statusCode]: {
                response: responseToWrite,
            },
        },
    };
};

const writeApiDoc = () => {
    if (!process.env.APIDOC) return;
    // Create apidoc if non-existent
    if (!fs.existsSync(outFolder)) {
        fs.mkdirSync(outFolder, { recursive: true });
    }

    const routes = Object.keys(apiCalls);

    routes.forEach((apiRoute) => {
        const methods = Object.keys(apiCalls[apiRoute]);
        methods.forEach((apiMethod) => {
            const {
                docName,
                apiGroup,
                apiName,
                routeTitle,
                params,
                body,
                query,
                headers,
            } = apiCalls[apiRoute][apiMethod];

            const statuses = Object.keys(
                apiCalls[apiRoute][apiMethod].statuses
            );

            const successResponseDocs = [];
            const errorResponseDocs = [];
            const paramsString = createParams({ params, body, query, headers });

            statuses.forEach((apiStatus) => {
                const { response } =
                    apiCalls[apiRoute][apiMethod].statuses[apiStatus];

                const responseString = createResponse(response);

                if (apiStatus < 400) {
                    successResponseDocs.push(
                        baseSuccessfulExample
                            .replace(/{{status}}/g, apiStatus)
                            .replace(/{{response}}/g, responseString)
                    );
                } else {
                    errorResponseDocs.push(
                        baseErrorExample
                            .replace(/{{status}}/g, apiStatus)
                            .replace(/{{response}}/g, responseString)
                    );
                }
            });

            const apiDoc = baseApiDoc
                .replace(/{{routeTitle}}/g, routeTitle)
                .replace(/{{params}}/g, paramsString)
                .replace(/{{apiName}}/g, apiName)
                .replace(/{{apiGroup}}/g, apiGroup)
                .replace(/{{method}}/g, apiMethod.toUpperCase())
                .replace(/{{route}}/g, docName)
                .replace(
                    /{{successResponses}}/g,
                    successResponseDocs.join("\n")
                )
                .replace(/{{errorResponses}}/g, errorResponseDocs.join("\n"));

            const path = (docName.charAt(0) === "/" ? docName : `/${docName}`)
                .replace(/\//g, "-")
                .replace(/:/g, "");

            fs.writeFileSync(
                `${outFolder}/${apiMethod.toUpperCase()}-${path}.js`,
                apiDoc
            );
        });
    });
};

module.exports = {
    setApiResponse,
    writeApiDoc,
};
