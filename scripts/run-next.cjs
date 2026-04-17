const { spawn } = require("node:child_process");

const nextBin = require.resolve("next/dist/bin/next");
const args = process.argv.slice(2);
const nodeOptions = process.env.NODE_OPTIONS ?? "";
const parentExecArgv = process.execArgv ?? [];

const nodeOptionParts = nodeOptions.split(/\s+/).filter(Boolean);
const sanitizedNodeOptionParts = [];

for (let index = 0; index < nodeOptionParts.length; index += 1) {
  const option = nodeOptionParts[index];

  if (option === "--localstorage-file") {
    index += 1;
    continue;
  }

  if (option.startsWith("--localstorage-file=")) {
    continue;
  }

  sanitizedNodeOptionParts.push(option);
}

const sanitizedNodeOptions = sanitizedNodeOptionParts.join(" ");
const sanitizedExecArgv = [];

for (let index = 0; index < parentExecArgv.length; index += 1) {
  const option = parentExecArgv[index];

  if (option === "--localstorage-file") {
    index += 1;
    continue;
  }

  if (option.startsWith("--localstorage-file=")) {
    continue;
  }

  sanitizedExecArgv.push(option);
}

const child = spawn(process.execPath, [...sanitizedExecArgv, nextBin, ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: sanitizedNodeOptions,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
