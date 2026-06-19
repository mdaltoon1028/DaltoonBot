import { execSync } from 'child_process';
try {
  console.log(execSync('ps aux | grep bot.py').toString());
} catch(e) {
  console.error(e);
}
