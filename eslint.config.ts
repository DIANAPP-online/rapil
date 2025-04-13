import antfu from '@antfu/eslint-config'

/** @type {import('eslint').Linter.Config[]} */

export default antfu({
  jsonc: false,
  yaml: false,
}, {
  rules: {
    'style/max-len': ['error', { code: 120 }],
    'style/max-statements-per-line': ['error', { max: 2 }],
    'style/arrow-parens': ['error', 'always'],
    'style/function-call-argument-newline': ['error', 'consistent'],
    'style/no-confusing-arrow': ['error', { onlyOneSimpleParam: true }],
  },
})
