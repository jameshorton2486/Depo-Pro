module.exports = {
  rules: {
    'no-anon-key': require('./rules/no-anon-key'),
    'no-jwt-assumptions': require('./rules/no-jwt-assumptions'),
    'no-service-role-in-client': require('./rules/no-service-role-in-client'),
  },
};
