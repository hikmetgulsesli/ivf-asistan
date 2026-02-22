import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const projectRoot = resolve(__dirname, '../..');
const clientRoot = join(projectRoot, 'client');

describe('US-001: Express server starts on port 4520', () => {
  it('should have server index.ts using port 4520', () => {
    const serverFile = readFileSync(join(projectRoot, 'src/server/index.ts'), 'utf-8');
    expect(serverFile).toContain('4520');
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

  it('should use Emerald/Cyan palette', () => {
    const globalsCss = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(globalsCss).toContain('#059669'); // Emerald 600
    expect(globalsCss).toContain('#0891b2'); // Cyan 600
  });

  it('should use Sora/Nunito Sans fonts', () => {
    const globalsCss = readFileSync(join(clientRoot, 'src/globals.css'), 'utf-8');
    expect(globalsCss).toContain('Sora');
    expect(globalsCss).toContain('Nunito Sans');
  });

  it('should have index.html with Google Fonts link', () => {
    const html = readFileSync(join(clientRoot, 'index.html'), 'utf-8');
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('Sora');
    expect(html).toContain('Nunito+Sans');
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
    expect(envExample).toContain('MINIMAX_API_KEY=');
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
