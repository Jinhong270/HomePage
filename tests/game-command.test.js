const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/commands.js"), "utf8");

function setup(onPrint) {
  const window = { location: { href: "https://www.jh270.com/terminal/" } };
  const output = [];
  let canceled = false;
  vm.runInNewContext(source, { window });
  const ctx = {
    async printLine(text, tone) {
      output.push({ text, tone });
      if (onPrint) canceled = onPrint();
    },
    stopped() { return canceled; }
  };
  return { window, output, run: args => window.JH270Commands.find("game").run(args, ctx) };
}

test("game and its supported aliases navigate the current tab to /game/", async () => {
  for (const args of [[], ["echo"], ["echo-courier"], ["ECHO"]]) {
    const app = setup();
    await app.run(args);
    assert.equal(app.window.location.href, "/game/");
    assert.equal(app.output.length, 1);
    assert.equal(app.output[0].tone, "accent");
  }
});

test("unknown game names and extra arguments leave the terminal open", async () => {
  for (const args of [["unknown"], ["echo", "extra"]]) {
    const app = setup();
    await app.run(args);
    assert.equal(app.window.location.href, "https://www.jh270.com/terminal/");
    assert.equal(app.output[0].tone, "warn");
  }
});

test("canceling the opening reply prevents navigation", async () => {
  const app = setup(() => true);
  await app.run([]);
  assert.equal(app.window.location.href, "https://www.jh270.com/terminal/");
});
