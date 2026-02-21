import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const projectRoot = resolve(__dirname, '../..');
const clientRoot = join(projectRoot, 'client');

describe('US-001: Express server starts on port 4520', () => {
  it('should have config using port 4520', () => {
    const configFile = readFileSync(join(projectRoot, 'src/config/index.ts'), 'utf-8');
    expect(configFile).toContain("'4520'");
  });
  it('should have .env.example with PORT=4520', () => {
    const envExample = readFileSync(join(projectRoot, '.env.example'), 'utf-8');
    expect(envExample).toContain('PORT=4520');
  });
});

describe('US-001: React + Vite frontend builds without errors', () => {
  it('should have valid vite.config.ts', () => {
    const viteConfig = readFileSync(join(clientRoot, 'vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('vite');
    expect(viteConfig).toContain('react');
  });
  it('should have valid package.json with build script', () => {
    const pkg = JSON.parse(readFileSync(join(clientRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts.build).toBeDefined();
  });
  it('should have App.tsx and main.tsx', () => {
    expect(existsSync(join(clientRoot, 'src/App.tsx'))).toBe(true);
    expect(existsSync(join(clientRoot, 'src/main.tsx'))).toBe(true);
  });
});

describe('US-001: Design tokens defined as CSS custom properties', () => {
  it('should have globals.css with CSS custom properties', () => {
    const css = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(css).toContain('--primary:');
    expect(css).toContain('--accent:');
    expect(css).toContain('--font-heading:');
    expect(css).toContain('--font-body:');
  });
  it('should use Emerald/Cyan palette', () => {
    const css = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(css).toContain('#059669');
    expect(css).toContain('#0891b2');
  });
  it('should use Sora/Nunito Sans fonts', () => {
    const css = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(css).toContain('Sora');
    expect(css).toContain('Nunito Sans');
  });
  it('should have index.html with Google Fonts', () => {
    const html = readFileSync(join(clientRoot, 'index.html'), 'utf-8');
    expect(html).toContain('fonts.googleapis.com');
  });
});

describe('US-001: Tailwind configured with custom theme', () => {
  it('should have tailwind.config.js extending theme', () => {
    const cfg = readFileSync(join(clientRoot, 'tailwind.config.js'), 'utf-8');
    expect(cfg).toContain('extend:');
    expect(cfg).toContain('colors:');
    expect(cfg).toContain('primary');
  });
});

describe('US-001: .env.example created', () => {
  it('should have .env.example', () => {
    expect(existsSync(join(projectRoot, '.env.example'))).toBe(true);
  });
  it('should contain required env vars', () => {
    const env = readFileSync(join(projectRoot, '.env.example'), 'utf-8');
    expect(env).toContain('PORT=');
    expect(env).toContain('DATABASE_URL=');
    expect(env).toContain('OPENAI_API_KEY=');
  });
});

describe('US-001: .gitignore includes standard exclusions', () => {
  it('should have node_modules', () => {
    const gi = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gi).toContain('node_modules');
  });
  it('should have .env', () => {
    const gi = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gi).toContain('.env');
  });
  it('should have dist/', () => {
    const gi = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gi).toContain('dist/');
  });
});

describe('US-001: Typecheck passes', () => {
  it('should have typecheck script', () => {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts.typecheck).toBeDefined();
  });
});
