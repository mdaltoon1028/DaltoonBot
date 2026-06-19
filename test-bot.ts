import { execSync } from "child_process";
try {
  console.log(execSync("python3 bot.py", { encoding: "utf-8" }));
} catch (e) {
  console.log("ERROR OUTPUT:");
  console.log(e.stdout ? e.stdout.toString() : "");
  console.log(e.stderr ? e.stderr.toString() : "");
  console.log(e.message);
}
