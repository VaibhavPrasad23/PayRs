# Payr Mentor Backend

## Prerequisites

The project has been developed upon

- node 18.15.0
- npm 9.5.0
- mongodb 6.0.5
- redis 7.0.11

## Setup

After cloning, move in the project root directory.

```bash
git config diff.submodule log
git config status.submodulesummary 1
git config submodule.recurse true
git submodule update --init
npm install
```

> Why the special treatment?
Because this code relies on our common [`schemata`](https://gitlab.com/payrletsplanit/schemata) repo, which contains all our schemas at one place. To use it, it has been setup as a submodule to this project.
Watch out for other commands modified around the same.

>**[NOTE]** Do not work inside the submodule `packages/schemata` directly. Instead, work on the schemata main repository directly, then pull the updates here.

[Read the submodules guide here](https://git-scm.com/book/en/v2/Git-Tools-Submodules) if you're new to it.

## Development

To get the latest changes and merge commit schemata automatically,

```bash
npm run git:pull
```
>**[NOTE]** The above command will unstage any of your changes in repository (not restore) and will then commit only the schemata submodule. If you do not want this to happen, then you can manually sync the submodule by running selective commands.


### For docker users

```bash
docker build . -t api.mentor
```

### Schemata usage

Example to use the schema module for its models

```js
const { Mentor } = require("@payr/schemata");

app.get('/mentor/:id', (req,res) => {
    ...
    let mentor = await Mentor.findOneById(req.params.id);
    ...
})
```

### Working

To generate latest api docs after pulling latest updates

```bash
npm run docs
```

To run server

```bash
npm start
```

or hotreload

```bash
npm run dev
```

#### For docker users

```bash
docker run -p 127.0.0.1:3000:3000 api.mentor
```

## Testing

Create test for any new apis you create, using existing api tests as reference for pre/post hooks setup for your new test.
Tests, if run successfully, generate raw api docs material which is further used by `npm run apidoc` command to generate the latest api docs, based on each api's tests requests, response and other data.

```bash
npm test
```

If above ran successfully, you can generate the latest docs of your apis

```bash
npm run apidoc
```

## Utilities

Check all available utility commands

```bash
npm run
```

Some of them are mentioned below

- To create a mentor with option to set as administrator

    ```bash
    npm run createadmin 
    ```

- To run any of the cli script file contained in the `shell/` directory (using exact script file name without extension)

    ```bash
    npm run cli -- --<scriptfilename>
    ```
    For example

    ```bash
    npm run cli -- --gettoken 
    ```

Reach out to the dev team at **[devs@payr.org.in](mailto:devs@payr.org.in)** for any doubts.