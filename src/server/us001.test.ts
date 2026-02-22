import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const clientRoot = join(projectRoot, 'client');

describe('US-001: Express server starts on port 4520', () => {
  it('should have server index.ts using port from environment', () => {
    const serverFile = readFileSync(join(projectRoot, 'src/server/index.ts'), 'utf-8');
    expect(serverFile).toMatch(/const PORT = .*config\.port/);
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
    expect(pkg.scripts.build).toContain('tsc');
    expect(pkg.scripts.build).toContain('vite build');
  });

  it('should have App.tsx and main.tsx', () => {
    expect(existsSync(join(clientRoot, 'src/App.tsx'))).toBe(true);
    expect(existsSync(join(clientRoot, 'src/main.tsx'))).toBe(true);
  });
});

describe('US-001: Design tokens defined as CSS custom properties', () => {
  it('should have globals.css with CSS custom properties', () => {
    const globalsCss = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(globalsCss).toContain('--primary:');
    expect(globalsCss).toContain('--accent:');
    expect(globalsCss).toContain('--font-heading:');
    expect(globalsCss).toContain('--font-body:');
    expect(globalsCss).toContain('--surface:');
    expect(globalsCss).toContain('--text:');
    expect(globalsCss).toContain('--border:');
  });

  it('should define primary and accent colors as hex values', () => {
    const globalsCss = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(globalsCss).toMatch(/--primary:\s*#(?:[0-9a-fA-F]{3}){1,2}/);
    expect(globalsCss).toMatch(/--accent:\s*#(?:[0-9a-fA-F]{3}){1,2}/);
  });

  it('should define heading and body fonts via CSS variables', () => {
    const globalsCss = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(globalsCss).toMatch(/--font-heading:\s*[^;]+;/);
    expect(globalsCss).toMatch(/--font-body:\s*[^;]+;/);
  });

  it('should have index.html with Google Fonts link', () => {
    const html = readFileSync(join(clientRoot, 'index.html'), 'utf-8');
    expect(html).toMatch(/<link[^>]+fonts\.googleapis\.com/);
  });
});

describe('US-001: Tailwind configured with custom theme', () => {
  it('should have tailwind.config.js extending theme', () => {
    const tailwindConfig = readFileSync(join(clientRoot, 'tailwind.config.js'), 'utf-8');
    expect(tailwindConfig).toContain('extend:');
    expect(tailwindConfig).toContain('colors:');
    expect(tailwindConfig).toContain('fontFamily:');
    expect(tailwindConfig).toContain('primary');
    expect(tailwindConfig).toContain('accent');
  });
});

describe('US-001: .env.example created with all required env vars', () => {
  it('should have .env.example file', () => {
    expect(existsSync(join(projectRoot, '.env.example'))).toBe(true);
  });

  it('should contain required environment variables', () => {
    const envExample = readFileSync(join(projectRoot, '.env.example'), 'utf-8');
    expect(envExample).toContain('PORT=');
    expect(envExample).toContain('DATABASE_URL=');
    expect(envExample).toContain('OPENAI_API_KEY=');
  });
});

describe('US-001: .gitignore includes standard exclusions', () => {
  it('should have .gitignore with node_modules', () => {
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('node_modules');
  });

  it('should have .gitignore with .env', () => {
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.env');
  });

  it('should have .gitignore with dist/', () => {
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('dist/');
  });

  it('should have .gitignore with .vscode/', () => {
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.vscode/');
  });

  it('should have .gitignore with .DS_Store', () => {
    const gitignore = readFileSync(join(projectRoot, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.DS_Store');
  });
});

describe('US-001: Typecheck passes', () => {
  it('should have typecheck script in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts.typecheck).toBeDefined();
    expect(pkg.scripts.typecheck).toContain('tsc --noEmit');
  });
});
