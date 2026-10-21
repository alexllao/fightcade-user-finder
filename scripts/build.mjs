import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const options = {
  entryPoints: ['src/background.js', 'src/manager.js'],
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: ['chrome120'],
  logLevel: 'info',
};

await mkdir('dist', { recursive: true });
await cp('public/manifest.json', 'dist/manifest.json');
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('Watching extension sources...');
} else {
  await build(options);
}
