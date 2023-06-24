const Schemata = require("@payr/schemata");
const { Logger } = require("../../../config/logger");
const Joi = require("../../utils/joi");
const {
    adminCollections,
    getModelFlatSchema,
    findOneAndDeleteRel,
} = require("./utils");

module.exports = {
    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    getCollections: async (req, res) => {
        try {
            return res.json({
                data: {
                    collections: adminCollections(),
                },
            });
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },

    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    getCollectionInfo: async (req, res) => {
        try {
            const { error, value } = Joi.object({
                collection: Joi.string()
                    .valid(...adminCollections())
                    .required(),
            }).validate({ ...req.query, ...req.params });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            const Model = Schemata[value.collection];
            return res.json({
                data: {
                    total: await Model.countDocuments({}),
                    fields: getModelFlatSchema(Model),
                },
            });
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },

    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    getCollectionData: async (req, res) => {
        try {
            const { error, value } = Joi.object({
                collection: Joi.string()
                    .valid(...adminCollections())
                    .required(),
                _id: Joi.objectId(),
                page: Joi.number().min(1).default(1),
                size: Joi.number().min(1).max(100).default(50),
            }).validate({ ...req.query, ...req.params });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            const { page, size, collection, _id } = value;
            let Model = Schemata[collection];
            let projection = {};
            Object.values(Model.schema.paths)
                .filter((path) => !path.path.startsWith("__"))
                .forEach(
                    (path) => (projection = { ...projection, [path.path]: 1 })
                );
            if (_id) {
                let refs = getModelFlatSchema(Model)
                    .filter((sch) => sch.refCollection)
                    .map((sch) => sch.name);
                let data = undefined;
                if (refs.length) {
                    data = await Model.findOne({ _id }, projection)
                        .populate(refs.join(" "))
                        .lean();
                } else {
                    data = await Model.findOne({ _id }, projection).lean();
                }
                if (!data) {
                    return res.status(404).json({
                        error: "Record not found.",
                    });
                }
                return res.json({
                    data,
                });
            } else {
                const total = await Model.countDocuments({});
                const data = await Model.find({}, projection, {
                    skip: (page - 1) * size,
                    limit: size,
                });
                return res.json({
                    total,
                    data,
                });
            }
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },

    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    createCollectionRecord: async (req, res) => {
        try {
            const { error, value: val } = Joi.object({
                collection: Joi.string()
                    .valid(...adminCollections())
                    .required(),
                set: Joi.array()
                    .items(
                        Joi.object({
                            field: Joi.string().required(),
                            value: Joi.required(),
                        })
                    )
                    .min(1)
                    .max(50),
            }).validate({ ...req.query, ...req.params, ...req.body });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            let { collection, set } = val;
            let Model = Schemata[collection];
            let schema = getModelFlatSchema(Model);
            schema = schema.filter((sv) => sv.editable !== false);
            let efv = set.find(
                (fv) => !schema.map((sv) => sv.name).includes(fv.field)
            );
            if (
                !schema
                    .filter((sv) => sv.required === true)
                    .every((sv) => set.map((fv) => fv.field).includes(sv.name))
            ) {
                return res.status(400).json({
                    error: `Missing some or all required fields. Ensure proper fields and values.`,
                });
            }
            if (!efv) {
                efv = set.find(
                    (fv) =>
                        !schema.some((kv) => {
                            let type = null;
                            if (!Joi.objectId().validate(fv.value).error) {
                                type = "objectid";
                            } else if (!Joi.date().validate(fv.value).error) {
                                type = "date";
                            } else {
                                type = typeof fv.value;
                            }
                            return (
                                kv.name == fv.field &&
                                kv.type.toLowerCase() == type &&
                                (kv.enum ? kv.enum.includes(fv.value) : true)
                            );
                        })
                );
            }
            if (efv) {
                return res.status(400).json({
                    error: `Invalid '${efv.field}:${efv.value}' pair for ${collection}. Ensure proper fields and values.`,
                });
            }
            let data = {};
            set.forEach((fv) => {
                data[fv.field] = fv.value;
            });
            data = await Model.create(data);
            return res.status(201).json({
                data,
            });
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },

    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    updateCollectionRecord: async (req, res) => {
        try {
            const { error, value: val } = Joi.object({
                collection: Joi.string()
                    .valid(...adminCollections())
                    .required(),
                _id: Joi.objectId().required(),
                set: Joi.array()
                    .items(
                        Joi.object({
                            field: Joi.string().required(),
                            value: Joi.required(),
                        })
                    )
                    .min(1)
                    .max(50)
                    .required(),
            }).validate({ ...req.query, ...req.params, ...req.body });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            let { collection, _id, set } = val;
            let Model = Schemata[collection];
            let schema = getModelFlatSchema(Model);
            schema = schema.filter((sv) => sv.editable !== false);
            let efv = set.find(
                (fv) => !schema.map((sv) => sv.name).includes(fv.field)
            );
            if (!efv) {
                efv = set.find(
                    (fv) =>
                        !schema.some((kv) => {
                            let type = null;
                            if (!Joi.objectId().validate(fv.value).error) {
                                type = "objectid";
                            } else if (!Joi.date().validate(fv.value).error) {
                                type = "date";
                            } else {
                                type = typeof fv.value;
                            }
                            return (
                                kv.name == fv.field &&
                                kv.type.toLowerCase() == type &&
                                (kv.enum ? kv.enum.includes(fv.value) : true)
                            );
                        })
                );
            }
            if (efv) {
                return res.status(400).json({
                    error: `Invalid '${efv.field}:${efv.value}' pair for ${collection}. Ensure proper fields and values.`,
                });
            }
            const data = await Model.findOne({ _id });
            if (!data) {
                return res.status(400).json({
                    error: `Record not found`,
                });
            }
            set.forEach((fv) => {
                data[fv.field] = fv.value;
            });
            await data.save();

            return res.json({
                data,
            });
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },

    /**
     *
     * @param {import("express").Request} req
     * @param {import("express").Response} res
     * @returns {import("express").Response}
     */
    deleteCollectionRecord: async (req, res) => {
        try {
            const { error, value: val } = Joi.object({
                collection: Joi.string()
                    .valid(...adminCollections())
                    .required(),
                _id: Joi.objectId().required(),
            }).validate({ ...req.query, ...req.params, ...req.body });
            if (error) {
                return res.status(400).json({ error: error.message });
            }
            const { collection, _id } = val;
            let Model = Schemata[collection];
            const data = await findOneAndDeleteRel(Model, { _id });
            if (!data) {
                return res.status(404).json({
                    error: `Record not found`,
                });
            }
            if (!data.deleted) {
                return res.status(403).json({
                    error: `Deletion failed`,
                    data,
                });
            }
            return res.json({
                data,
            });
        } catch (e) {
            Logger.error(e);
            res.status(500).json({
                error: "Something went wrong.",
            });
        }
    },
};
