import { execSync } from "child_process";
try {
  execSync("python3 -m py_compile bot.py");
  console.log("Syntax is OK!");
} catch (e) {
  console.log(e.stderr.toString());
}
