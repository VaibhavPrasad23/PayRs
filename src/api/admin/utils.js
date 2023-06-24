const Schemata = require("@payr/schemata");
const { OnDelete } = require("@payr/schemata/utils");

/**
 *
 * @param {Boolean} namesOnly
 * @returns {import("mongoose").Model}
 */
const adminCollections = (namesOnly = true) => {
    if (!namesOnly) return Schemata.administered;
    return Schemata.administered.map((mod) => mod.modelName);
};

/**
 *
 * @param {import("mongoose").Model} model
 * @returns
 */
const getModelFlatSchema = (model) => {
    return Object.values(model.schema.paths)
        .filter((path) => !path.path.startsWith("__"))
        .map((path) => {
            let editable = undefined;
            if (path["$immutable"] != undefined) {
                editable = !path["$immutable"];
            } else if (path.options.auto != undefined) {
                editable = !path.options.auto;
            } else {
                editable = path.options.editable;
            }
            let required = undefined;
            if (path.defaultValue !== "" && path.isRequired) {
                required = true;
            }
            return {
                name: path.options.proxy ? path.options.proxy : path.path,
                type: path.instance,
                default: path.defaultValue,
                editable,
                required,
                enum: path.options.enum,
                refCollection: path.options.ref,
                refOnDelete: path.options.onDelete,
            };
        });
};

module.exports = {
    adminCollections,
    getModelFlatSchema,

    /**
     * To perform record deletion keeping relations with other models in consideration.
     * May reject deletion if relation with certain models instruct to do so.
     * @param {import("mongoose").Model} Model
     * @param {JSON} filter
     * @param {JSON} options
     * @returns
     */
    findOneAndDeleteRel: async (Model, filter, options = {}) => {
        let record = await Model.findOne(filter, options);
        if (!record) return null;
        let restrictors = adminCollections(false).filter((col) =>
            getModelFlatSchema(col).some(
                (path) =>
                    path.refCollection == Model.modelName &&
                    path.refOnDelete == OnDelete.RESTRICT
            )
        );
        if (restrictors.length) {
            let restrictions = await Promise.all(
                restrictors.map(async (restrictor) => {
                    let key = getModelFlatSchema(restrictor)
                        .filter(
                            (path) =>
                                path.refCollection == Model.modelName &&
                                path.refOnDelete == OnDelete.RESTRICT
                        )
                        .map((path) => path.name)[0];
                    const exists = await restrictor.countDocuments({
                        [key]: record._id,
                    });
                    if (exists)
                        return {
                            refRestrict: restrictor.modelName,
                            total: exists,
                        };
                    return false;
                })
            );
            restrictions = restrictions.filter((restriction) => restriction);
            if (restrictions.length) {
                return { deleted: false, restrictions };
            }
        }
        record = await Model.findOneAndDelete({ _id: record._id });
        if (!record) return null;
        let nonRestrictedCols = adminCollections(false).filter((col) =>
            getModelFlatSchema(col).some(
                (path) =>
                    path.refCollection == Model.modelName &&
                    path.refOnDelete !== OnDelete.RESTRICT
            )
        );
        let related = await Promise.all(
            nonRestrictedCols.map(async (col) => {
                let refPath = getModelFlatSchema(col).find(
                    (path) =>
                        path.refCollection == Model.modelName &&
                        path.refOnDelete !== OnDelete.RESTRICT
                );
                let rel = {};
                switch (refPath.refOnDelete) {
                    case OnDelete.CASCADE:
                        rel = await col.deleteMany({
                            [refPath.name]: record._id,
                        });
                        break;
                    case OnDelete.SET_NULL:
                        rel = await col.updateMany(
                            { [refPath.name]: record._id },
                            { $set: { [refPath.name]: null } }
                        );
                        break;
                    case OnDelete.SET_DEFAULT:
                        rel = await col.updateMany(
                            { [refPath.name]: record._id },
                            {
                                $set: {
                                    [refPath.name]: refPath.default || null,
                                },
                            }
                        );
                        break;
                    case OnDelete.DO_NOTHING:
                        return null;
                    default:
                        return null;
                }
                rel.refRelated = col.modelName;
                return rel;
            })
        );
        return { deleted: record, related: related.filter((r) => r) };
    },
};
