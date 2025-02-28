const { isEmpty, merge } = require("lodash/fp");

const getModelPopulationAttributes = (model) => {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }

  return model.attributes;
};

const validateIgnore = (param) => {
    if (!param) {
        return []
    }
    return param.split(',').map((item) => item.trim())
}

const getFullPopulateObject = (modelUid, maxDepth = 20, skipCreatorFields, ignoreFields = [], ignorePaths = [], parentPath = '') => {
    const debug = true
    if (maxDepth <= 1) {
        debug && console.log('maxDepth reached, skipping')
        return true
    }
    if (modelUid === 'admin::user' && skipCreatorFields) {
        return undefined
    }

    const populate = {}
    const model = strapi.getModel(modelUid)

    const attributes = Object.entries(getModelPopulationAttributes(model)).filter(([, value]) =>
        ['relation', 'component', 'dynamiczone', 'media'].includes(value.type)
    )

    for (const [attrName, attrObject] of attributes) {
        const fullFieldName = parentPath ? `${parentPath}.${attrName}` : attrName

        // console.log('attrName:', attrName, ' :', model.collectionName + '.' + attrName)

        // Check if the field is ignored (using attrName)
        if (ignoreFields.includes(attrName) || ignoreFields.includes(model.collectionName + '.' + attrName)) {
            debug && console.log(`Ignoring field: ${model.collectionName + '.' + attrName}`)
            continue
        }

        // Check if the field is ignored (using fullFieldName)
        if (ignorePaths.includes(fullFieldName)) {
            debug && console.log(`Ignoring field: ${fullFieldName}`)
            continue
        }

        if (debug) {
            const skipLog = [
                'admin::user',
                'admin::role',
                'admin::permission',
                'plugin::upload.file',
            ]
            if (!attrObject || !skipLog.includes(attrObject.target)) {
                console.log('attrObject', attrName, attrObject)
            }
        }

        // Skip if the attribute is empty
        if (isEmpty(attrObject)) continue

        if (attrObject.type === 'component') {
            populate[attrName] = getFullPopulateObject(
                attrObject.component,
                maxDepth - 1,
                skipCreatorFields,
                ignoreFields,
                ignorePaths,
                debug,
                fullFieldName
            )
        } else if (attrObject.type === 'dynamiczone') {
            const dynamicPopulate = attrObject.components.reduce((prev, cur) => {
                const curPopulate = getFullPopulateObject(
                    cur,
                    maxDepth - 1,
                    skipCreatorFields,
                    ignoreFields,
                    ignorePaths,
                    debug,
                    fullFieldName
                )
                return curPopulate === true ? prev : deepAssign(prev, curPopulate)
            }, {})

            populate[attrName] = isEmpty(dynamicPopulate) ? true : dynamicPopulate
        } else if (attrObject.type === 'relation') {
            if (attrObject.target === 'admin::user' && skipCreatorFields) {
                continue
            }
            const relationPopulate = getFullPopulateObject(
                attrObject.target,
                maxDepth - 1,
                skipCreatorFields,
                ignoreFields,
                ignorePaths,
                debug,
                fullFieldName
            )
            if (!isEmpty(relationPopulate)) {
                populate[attrName] = relationPopulate
            }
        } else if (attrObject.type === 'media') {
            populate[attrName] = true
        }
    }

    return isEmpty(populate) ? true : { populate }
}

function deepAssign(target, source) {
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                if (!target[key] || typeof target[key] !== 'object' || target[key] === null) {
                    target[key] = source[key]
                }
                deepAssign(target[key], source[key])
            } else if (!target[key] || typeof target[key] !== 'object' || target[key] === null) {
                target[key] = source[key]
            }
        }
    }
    return target
}

module.exports = {
  getFullPopulateObject,
  validateIgnore
};
