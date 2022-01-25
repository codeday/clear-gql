/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: ["node_modules\\?!(marked)\\"],
  timers: "fake",
  maxWorkers: "50%"
};
