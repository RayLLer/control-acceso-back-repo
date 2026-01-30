export default {
  routes: [
      {
      // Path defined with an URL parameter
          method: 'POST',
          path: '/custom-permissiom/updateRole',
          handler: 'custom-permissiom.updateRole',
          config: {
              auth: false
          }
      },
      {
      // Path defined with an URL parameter
          method: 'GET',
          path: '/custom-permissiom/getCustomPermissionsByRoleId/:id',
          handler: 'custom-permissiom.getCustomPermissionsByRoleId',
          config: {
              auth: false
          }
      }
  ]
}
