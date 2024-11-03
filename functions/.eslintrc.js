module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: [
    "eslint:recommended"
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  rules: {
    "max-len": "off",
    "indent": ["error", 2]
  }
};
