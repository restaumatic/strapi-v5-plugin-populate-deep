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

  // Subscribe to the lifecycles that we are intrested in.
  strapi.db.lifecycles.subscribe((event) => {
    if (event.action === "beforeFindMany" || event.action === "beforeFindOne") {
      const level = event.params?.pLevel;

      if (level !== undefined) {
        const depth = level ?? defaultDepth;
        const modelObject = getFullPopulateObject(event.model.uid, depth, skipCreatorFields, ignoreFields, ignorePaths, debug);
        event.params.populate = modelObject.populate;
      }
    }
  });
};
