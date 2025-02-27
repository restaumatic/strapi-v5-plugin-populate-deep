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

  console.log(`modelUid: ${modelUid}, maxDepth: ${maxDepth}, ignore: ${JSON.stringify(ignore)}, skipCreatorFields: ${skipCreatorFields}, ignoreFields: ${JSON.stringify(ignoreFields)}, ignorePaths: ${JSON.stringify(ignorePaths)}, parentPath: ${parentPath}`)

  
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
    
    if (ignoreFields?.indexOf(key) !== -1 || ignoreFields?.indexOf(model.collectionName + '.' + key) !== -1) {
          continue
      }

      // Check if any ignore path pattern matches the current field path
      if (ignorePaths?.some(pattern => {
          // Check if pattern is a regex string (starts and ends with /)
          if (pattern.startsWith('/') && pattern.endsWith('/')) {
              const regexPattern = new RegExp(pattern.slice(1, -1));
              return regexPattern.test(fullFieldName);
          }
          // Otherwise check if fullFieldName contains the pattern
          return fullFieldName.includes(pattern);
      })) {
          continue;
      }
      
      // Special case for nested localizations - only populate top-level localizations
      if (key === "localizations" && fullFieldName !== "localizations") {
          continue;
      }

      if (isEmpty(value)) continue

      if (value) {
        if (value.type === "component") {
          populate[key] = getFullPopulateObject(
            value.component,
            maxDepth - 1,
            ignore,
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
          if (key === "localizations") {
            populate[key] = {
              fields: ['locale']
            };
          } else {
            const relationPopulate = getFullPopulateObject(
                value.target,
                maxDepth - 1,
                ignore,
                skipCreatorFields,
                ignoreFields,
                ignorePaths,
                fullFieldName
            );
            if (relationPopulate) {
              populate[key] = relationPopulate;
            }
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
