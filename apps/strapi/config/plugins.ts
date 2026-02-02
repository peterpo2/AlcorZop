export default ({ env }) => ({
  i18n: {
    enabled: false,
  },
  "users-permissions": {
    config: {
      jwtSecret: env("USERS_PERMISSIONS_JWT_SECRET"),
    },
  },
});
