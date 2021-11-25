const { pathsToModuleNameMapper } = require('ts-jest/utils')
const { compilerOptions } = require('./tsconfig')

module.exports = {
    preset: 'ts-jest',
    roots: ['<rootDir>'],
    setupFilesAfterEnv: [
        '<rootDir>/test/setup.ts'
    ],
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/' }),
        '^.+\\.html?$': '<rootDir>/test/mock/htmlTemplate.ts'
    }
}
