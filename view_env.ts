import { execSync } from 'child_process';
console.log(execSync('cat .env').toString());
