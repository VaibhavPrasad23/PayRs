"use strict";

require("../init");
const mongoose = require("mongoose");
const {
    MongoMemoryReplSet,
    MongoMemoryServer,
} = require("mongodb-memory-server");

let mongod;
let replset;

module.exports.startDatabase = async () => {
    try {
        if (__MONGOD__.length) {
            mongod = __MONGOD__[0];
            mongod.ensureInstance();
            return mongod;
        }
        throw Error("No global mongod instance found");
    } catch {
        mongod = await MongoMemoryServer.create();
        __MONGOD__.push(mongod);
        return mongod;
    }
};

module.exports.startReplicaSet = async () => {
    try {
        if (__MONGOREPL__.length) {
            replset = __MONGOREPL__[0];
            if (replset.state !== "running") {
                await replset.start();
            }
            return replset;
        }
        throw Error("No global replset instance found");
    } catch {
        replset = await MongoMemoryReplSet.create({ replSet: { count: 2 } });
        __MONGOREPL__.push(replset);
        return replset;
    }
};

module.exports.connectInitDatabase = async () => {
    let uri,
        mongooseOpts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
    if (!mongod) {
        uri = (await this.startDatabase()).getUri("test_clan");
    } else {
        uri = mongod.getUri("test_clan");
    }

    await mongoose.connect(uri, mongooseOpts);
};

module.exports.connectInitReplSet = async () => {
    let uri,
        mongooseOpts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
    if (!replset) {
        uri = (await this.startReplicaSet()).getUri("test_payr_repl");
    } else {
        uri = replset.getUri("test_payr_repl");
    }

    await mongoose.connect(uri, mongooseOpts);
};

module.exports.clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany();
    }
};

module.exports.dropDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
};

module.exports.disconnectDatabase = async () => {
    await mongoose.connection.close();
};

module.exports.clearDropDatabase = async () => {
    await this.clearDatabase();
    await this.dropDatabase();
};

module.exports.clearDropDisconnectDatabase = async () => {
    await this.clearDropDatabase();
    await this.disconnectDatabase();
    // await this.stopDatabase();
};
module.exports.clearDropDisconnectReplSet = async () => {
    await this.clearDropDatabase();
    await this.disconnectDatabase();
    // await this.stopReplSet();
};

module.exports.stopDatabase = async () => {
    await mongod.stop();
};
module.exports.stopReplSet = async () => {
    await replset.stop();
};

module.exports.clearDropDisconnectStopDatabase = async () => {
    await this.clearDropDisconnectDatabase();
    await this.stopDatabase();
};
module.exports.clearDropDisconnectStopReplSet = async () => {
    await this.clearDropDisconnectDatabase();
    await this.stopReplSet();
};
