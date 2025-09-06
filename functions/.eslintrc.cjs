// functions/.eslintrc.cjs
module.exports = {
  env: { es6: true, node: true },
  parserOptions: { ecmaVersion: 2020 },
  extends: ["eslint:recommended", "google"],
  rules: {
    // nới lỏng – không chặn deploy vì lỗi style
    "object-curly-spacing": "off",
    "comma-dangle": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "linebreak-style": "off",
    "indent": "off",
    "max-len": "off"
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: { mocha: true },
      rules: {}
    }
  ],
  globals: {}
};
