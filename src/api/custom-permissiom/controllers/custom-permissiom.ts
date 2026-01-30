/**
 * custom-permissiom controller
 */

// import { factories } from '@strapi/strapi';

// export default factories.createCoreController('api::custom-permissiom.custom-permissiom');

import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::custom-permissiom.custom-permissiom",
  ({ strapi }): {} => ({
    async updateRole(ctx) {
      try {
        console.log(ctx);
        return await strapi
          .service("api::custom-permissiom.custom-permissiom")
          .updateRole(ctx);
      } catch (error) {
        return ctx.badRequest("Error", error);
      }
    },
    async getCustomPermissionsByRoleId(ctx) {
      try {
        return await strapi
          .service("api::custom-permissiom.custom-permissiom")
          .getCustomPermissionsByRoleId(ctx);
      } catch (error) {
        return ctx.badRequest("Error", error);
      }
    },
  })
);