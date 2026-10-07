import { build } from './src/build.js';

try {
  await build();
} catch (err) {
  console.error(`构建失败:${err.message}`);
  process.exit(1);
}
