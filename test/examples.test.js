"use strict";

const path = require("path");

const spawn = require("cross-spawn");

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: value => typeof value === "string",
  print: value => value,
});

describe("examples", () => {
  const result = spawn.sync("npm", ["run", "eslint:examples", "--silent"], {
    encoding: "utf8",
  });

  const output = JSON.parse(result.stdout);

  for (const item of output) {
    const name = path.basename(item.filePath);
    test(name, () => {
      expect(item).toMatchObject({
        messages: [],
        errorCount: 0,
        warningCount: 0,
        fixableErrorCount: 0,
        fixableWarningCount: 0,
      });
      expect(item.output).toMatchSnapshot();
    });
  }
});
