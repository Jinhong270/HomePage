const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/commands.js"), "utf8");

function terminal(storage, clock = { day: 19 }) {
  class LocalDate extends Date {
    constructor() { super(2026, 10, clock.day, 23, 59); }
  }
  const window = { localStorage: storage };
  vm.runInNewContext(source, { window, Date: LocalDate });
  const command = window.JH270Commands.find("decode");
  return async function (...args) {
    const lines = [];
    await command.run(args, { stopped: () => false, printLine: text => lines.push(text) });
    return lines.join("\n");
  };
}

function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_, data) => { value = data; } };
}

test("decode explains the clues and charges only new five-digit guesses", async () => {
  const run = terminal(memoryStorage());
  assert.match(await run("help"), /Each digit counts once/);
  for (const args of [["1234"], ["12347"], ["12345", "6"]]) {
    assert.match(await run(...args), /Enter five digits/);
  }
  assert.match(await run(), /8 guesses left/);
  assert.match(await run("22222"), /3 exact · 0 misplaced/);
  assert.match(await run("11244"), /0 exact · 3 misplaced/);
  assert.match(await run("11244"), /Already on the board/);
  assert.match(await run(), /6 guesses left/);
});

test("daily progress survives reload, locks on success, and rolls over at local midnight", async () => {
  const clock = { day: 19 };
  const storage = memoryStorage();
  const first = terminal(storage, clock);
  await first("22222");
  const reopened = terminal(storage, clock);
  assert.match(await reopened(), /1  22222/);
  assert.match(await reopened("42122"), /Signal locked in 2\/8/);
  assert.match(await first("55555"), /Signal locked in 2\/8/);
  clock.day++;
  assert.match(await reopened(), /2026-11-20[\s\S]*8 guesses left/);
  assert.match(await reopened("23156"), /Signal locked in 1\/8/);
});

test("an exhausted board reveals the daily signal and rejects further attempts", async () => {
  const run = terminal(memoryStorage("broken"));
  for (const guess of ["11111", "22222", "33333", "44444", "55555", "66666", "12345", "54321"]) {
    await run(guess);
  }
  const result = await run("42122");
  assert.match(result, /Transmission closed. Today's signal was 42122/);
  assert.doesNotMatch(result, /Signal locked/);
});

test("an unavailable or unwritable store still tracks the current session", async () => {
  const blocked = () => { throw Error("storage unavailable"); };
  for (const storage of [
    { getItem: blocked, setItem: blocked },
    { getItem: () => '{"day":"2026-11-19","guesses":[]}', setItem: blocked }
  ]) {
    const run = terminal(storage);
    await run("11111");
    assert.match(await run(), /7 guesses left/);
  }
});
