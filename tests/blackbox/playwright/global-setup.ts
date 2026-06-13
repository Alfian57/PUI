import * as fs from 'fs';
import * as path from 'path';

async function globalSetup() {
  const testIdFile = path.join(__dirname, 'tests', 'test_id.tmp');
  fs.writeFileSync(testIdFile, Date.now().toString());
}

export default globalSetup;
