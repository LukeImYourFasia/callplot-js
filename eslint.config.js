import eslint from '@eslint/js';
import n from 'eslint-plugin-n';
import security from 'eslint-plugin-security';

export default [
  eslint.configs.recommended,
  // 2.5 #3.1: ESLint with Node plugins (section 2.5)
  n.configs["flat/recommended"],
  // 2.5 #6.1: security lint rules
  security.configs.recommended,
  {
    rules: {
      // section 2.5 practices set as errors
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
    },
  },
  {
    // The security plugin stays on, but two of its rules cannot pass this
    // port: detect-object-injection fires on every parsed-key map access,
    // and detect-non-literal-fs-filename on fixture/CLI paths, which are
    // literal-by-construction in test/ and bin/ but computed.
    rules: {
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    // test/browser runs Playwright (a dev dependency, never npm-shipped):
    // n's no-unpublished-import does not apply to the browser test harness.
    files: ["test/browser/**"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },
];
