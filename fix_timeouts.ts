import fs from 'fs';
let content = fs.readFileSync('bot.py', 'utf8');
content = content.replace(/timeout=5/g, 'timeout=20');
content = content.replace(/timeout=6/g, 'timeout=20');
content = content.replace(/timeout=8/g, 'timeout=20');
content = content.replace(/timeout=10/g, 'timeout=20');
fs.writeFileSync('bot.py', content);
console.log('Timeouts replaced in bot.py');
