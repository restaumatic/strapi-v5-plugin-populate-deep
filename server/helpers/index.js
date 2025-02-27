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

const getFullPopulateObject = (modelUid, maxDepth = 20, ignore, skipCreatorFields, ignoreFields = [], ignorePaths = [], parentPath = '') => {

  if (maxDepth <= 1) {
    return true;
  }
  if (modelUid === "admin::user" && skipCreatorFields) {
    return undefined;
  }

  
  const model = strapi.getModel(modelUid);

  const attributes = Object.entries(getModelPopulationAttributes(model)).filter(([, value]) =>
      ['relation', 'component', 'dynamiczone', 'media'].includes(value.type)
  )

  const populate = {};
  if (ignore && !ignore.includes(model.collectionName))
    ignore.push(model.collectionName);

    for (const [key, value] of attributes) {
      const fullFieldName = parentPath ? `${parentPath}.${key}` : key

      console.log(`Key: ${key}, Value Type: ${value.type}, Full Path: ${fullFieldName}`)
   
      if (ignore?.includes(key)) continue;

      if (ignoreFields?.includes(key) || ignoreFields?.includes(model.collectionName + '.' + key)) {
          continue
      }

      if (ignorePaths?.includes(fullFieldName)) {
          continue
      }

      if (isEmpty(value)) continue

      if (value) {
        if (value.type === "component") {
          populate[key] = getFullPopulateObject(
            value.component,
            maxDepth - 1,
            skipCreatorFields,
            ignoreFields,
            ignorePaths,
            fullFieldName
          );
        } else if (value.type === "dynamiczone") {
          const dynamicPopulate = value.components.reduce((prev, cur) => {
            const curPopulate = getFullPopulateObject(
              cur,
              maxDepth - 1,
              ignore,
              skipCreatorFields,
              ignoreFields,
              ignorePaths,
              fullFieldName
            );
            return merge(prev, {[cur]: curPopulate});
          }, {});
          populate[key] = isEmpty(dynamicPopulate) ? true : { on: dynamicPopulate };
        } else if (value.type === "relation") {
          const relationPopulate = getFullPopulateObject(
              value.target,
              key === "localizations" && maxDepth > 2 ? 1 : maxDepth - 1,
              ignore,
              skipCreatorFields,
              ignoreFields,
              ignorePaths,
              fullFieldName
          );
          if (relationPopulate) {
            populate[key] = relationPopulate;
          }
        } else if (value.type === "media") {
          populate[key] = {
            fields: ['url', 'alternativeText']
          };
        }
      }
    }
  return isEmpty(populate) ? true : { populate };
};

module.exports = {
  getFullPopulateObject,
};
