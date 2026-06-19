import * as fs from 'fs';
import * as https from 'https';

https.get('https://raw.githubusercontent.com/MHSanaei/3x-ui/main/frontend/src/pages/api-docs/endpoints.ts', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('endpoints.ts', data);
    console.log("Downloaded endpoints.ts");
  });
});
