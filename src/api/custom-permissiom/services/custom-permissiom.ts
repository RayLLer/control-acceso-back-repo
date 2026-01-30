/**
 * custom-permissiom service
 */

// import { factories } from '@strapi/strapi';

// export default factories.createCoreService('api::custom-permissiom.custom-permissiom');

/**
 * custom-permission service
 */

import { factories } from "@strapi/strapi";

export default factories.createCoreService(
  "api::custom-permissiom.custom-permissiom",
  ({ strapi }): {} => ({
    async updateRole(ctx) {
      const data = ctx.request.body;
      const roleId = data.roleId;
      const customPermissions = data.customPermissionsIds;

      const allPermission = [];
      for (let i = 0; i < customPermissions.length; i++) {
        const element: number = customPermissions[i];
        const permissions: any = await strapi.entityService.findMany(
          "api::custom-permissiom.custom-permissiom",
          {
            filters: {
              id: element,
            },
            populate: "*",
          }
        );
        for (let j = 0; j < permissions.length; j++) {
          const elementPermission = permissions[j];
          for (
            let k = 0;
            k < elementPermission.controllers_permissions.length;
            k++
          ) {
            allPermission.push(elementPermission.controllers_permissions[k]);
          }
        }
      }
      console.log(generateObject(allPermission))
       await strapi
        .service("plugin::users-permissions.role")
        .updateRole(roleId, generateObject(allPermission));

        const cp: any = await strapi.entityService.findMany('api::custom-permission-role.custom-permission-role', {
          filters: {
            role: roleId
          }
        })
        console.log(cp)
        if(cp && cp.length > 0) {
          await strapi.entityService.update('api::custom-permission-role.custom-permission-role', cp[0].id, {
            data: {
              role: roleId,
              custom_permissions: customPermissions
            } as any
          })
        } else {
          await strapi.entityService.create('api::custom-permission-role.custom-permission-role', {
            data: {
              role: roleId,
              custom_permissions: customPermissions
            }
          })
        }

      return true;
    },

    async getCustomPermissionsByRoleId(ctx) {
      const data = ctx.request.params;
      const roleId = data.id;
      return await strapi.entityService.findMany('api::custom-permission-role.custom-permission-role', {
        filters: {
          role: roleId
        },
        populate: '*'
      })
    }
  })
);

const generateObject = (inputList) => {
  const output = {
    permissions: {},
  };

  inputList.forEach((item) => {
    const { name, base, method, type } = item;
    // const api = `${type}::${base}`;
    const api = name.split('.')[0]

    if (!output.permissions[api]) {
      output.permissions[api] = {
        controllers: {},
      };
    }

    if (!output.permissions[api].controllers[base]) {
      output.permissions[api].controllers[base] = {};
    }

    output.permissions[api].controllers[base][method] = {
      enabled: true,
      policy: "",
    };
  });

  return output;
}
