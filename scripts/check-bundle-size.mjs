import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const distAssetsDir = path.resolve('dist/assets');
const maxJsKb = Number(process.env.MAX_JS_KB || 400);
const maxCssKb = Number(process.env.MAX_CSS_KB || 80);

function kb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

async function main() {
  const files = await readdir(distAssetsDir);
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(distAssetsDir, file);
    const info = await stat(fullPath);
    const sizeKb = kb(info.size);

    if (file.endsWith('.js') && sizeKb > maxJsKb) {
      violations.push(`${file}: ${sizeKb} KB exceeds ${maxJsKb} KB`);
    }
    if (file.endsWith('.css') && sizeKb > maxCssKb) {
      violations.push(`${file}: ${sizeKb} KB exceeds ${maxCssKb} KB`);
    }
  }

  if (violations.length > 0) {
    console.error('Bundle size budget failed:');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log(`Bundle size budget passed (JS <= ${maxJsKb}KB, CSS <= ${maxCssKb}KB).`);
}

main().catch((error) => {
  console.error('Failed to run bundle size check:', error);
  process.exit(1);
});
