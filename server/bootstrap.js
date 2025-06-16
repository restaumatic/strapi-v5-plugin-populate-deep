"use strict";
const { getFullPopulateObject } = require("./helpers");

module.exports = ({ strapi }) => {
  const {
    defaultDepth,
    ignoreFields,
    ignorePaths,
    skipCreatorFields,
    debug,
  } = strapi.config.get('plugin.' + 'strapi-v5-plugin-populate-deep')

  strapi.db.lifecycles.subscribe((event) => {
    if (event.action === "beforeFindMany" || event.action === "beforeFindOne") {
      const level = event.params?.pLevel;

      if (level !== undefined) {
        const depth = level ?? defaultDepth;
        const modelObject = getFullPopulateObject(event.model.uid, depth, skipCreatorFields, ignoreFields, ignorePaths, debug);

        if (modelObject && modelObject.populate) {
          if (debug) {
            console.log('Final populate object:', JSON.stringify(modelObject.populate));
          }

          event.params.populate = modelObject.populate;
        }
      }
    }
  });
};
