import { spawnSync } from "child_process";

const out = spawnSync("python3", ["test-conn.py"]);
console.log(out.stdout.toString());
console.log(out.stderr.toString());
