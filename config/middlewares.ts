export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
'strapi::cors',
        // {
        //   name: 'strapi::cors',
        //   config: {
        //     origin: ['http://95.111.254.235/'],
        //     headers: '*',
        //   },
        // },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];