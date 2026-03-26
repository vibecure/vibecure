#!/usr/bin/env node

/**
 * prepare.js — File walking + service detection + context assembly.
 *
 * Walks a project directory, detects paid API services (SMS, Email, LLM),
 * managed auth services, and deployment platform. Outputs JSON to stdout
 * for the LLM to analyze.
 *
 * Usage:  node prepare.js <project-dir>
 * Exit:   0 = success (check JSON "mode" field), 1 = bad args,
 *         2 = no services detected
 */

const fs = require('fs');
const path = require('path');
const signatures = require('./service-signatures.json');

// ─── File walking ────────────────────────────────────────────────────────────

const ALWAYS_SKIP_DIRS = new Set([
  'node_modules', '.git', 'coverage',
  '.next', '.nuxt', '.output', '.vercel', '.netlify',
  '.turbo', '.cache', '.parcel-cache', '.svelte-kit',
  'out', 'tmp', '.tmp', '.temp',
]);
const BUILT_OUTPUT_DIRS = new Set(['dist', 'build']);
const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'bun.lockb', 'npm-shrinkwrap.json',
]);
const CODE_EXTENSIONS = new Set(['.js', '.ts', '.tsx', '.mjs', '.cjs']);

function isCodeFile(filename) {
  const dot = filename.lastIndexOf('.');
  return dot !== -1 && CODE_EXTENSIONS.has(filename.slice(dot));
}

function shouldSkipBuiltOutput(projectRoot) {
  const SOURCE_SIGNALS = ['src', 'lib', 'routes', 'server', 'controllers', 'api'];
  let hasSource = false;
  try {
    const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && SOURCE_SIGNALS.includes(entry.name)) {
        hasSource = true;
        break;
      }
      if (entry.isFile() && /^(?:app|server|index)\.[jt]sx?$/.test(entry.name)) {
        hasSource = true;
        break;
      }
    }
  } catch {
    return true;
  }
  if (hasSource) return true;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
    const entrypoints = [pkg.main, pkg.module, ...(typeof pkg.bin === 'string' ? [pkg.bin] : Object.values(pkg.bin || {}))].filter(Boolean);
    for (const ep of entrypoints) {
      if (/^\.?\/?(?:dist|build)\//.test(ep)) return false;
    }
  } catch { /* no package.json or malformed */ }
  return false;
}

function walkDir(dir, base = dir, skipBuilt = null) {
  if (skipBuilt === null) skipBuilt = shouldSkipBuiltOutput(base);
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
    if (skipBuilt && BUILT_OUTPUT_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, base, skipBuilt));
    } else if (entry.isFile() && isCodeFile(entry.name) && !SKIP_FILES.has(entry.name)) {
      results.push({ relative: path.relative(base, fullPath), absolute: fullPath });
    }
  }
  return results;
}

// ─── Service detection ───────────────────────────────────────────────────────

function detectServices(codeFiles, packageJson) {
  const services = {};
  const deps = Object.keys({
    ...(packageJson && packageJson.dependencies),
    ...(packageJson && packageJson.devDependencies),
  });

  for (const [domain, config] of Object.entries(signatures.domains)) {
    const matched = [];
    let provider = null;

    for (const { relative, content } of codeFiles) {
      let hit = false;
      for (const imp of config.imports) {
        if (content.includes(imp)) { hit = true; break; }
      }
      if (hit) {
        matched.push(relative);
        if (!provider) {
          for (const [name, importStr] of Object.entries(config.providers)) {
            if (content.includes(importStr)) { provider = name; break; }
          }
        }
      }
    }

    // Fallback: check package.json dependencies
    if (matched.length === 0 && deps.length > 0) {
      for (const [name, importStr] of Object.entries(config.providers)) {
        if (deps.includes(importStr)) {
          provider = name;
          break;
        }
      }
    }

    services[domain] = {
      detected: matched.length > 0 || provider !== null,
      provider,
      files: matched,
    };
  }

  return services;
}

function detectManagedServices(allContent) {
  const found = [];
  for (const svc of signatures.managedServices) {
    // Must match an import AND (if contentMatch exists) at least one content pattern
    const hasImport = svc.imports.some(imp => allContent.includes(imp));
    if (!hasImport) continue;
    if (svc.contentMatch && svc.contentMatch.length > 0) {
      const hasContent = svc.contentMatch.some(pat => allContent.includes(pat));
      if (!hasContent) continue;
    }
    found.push({
      name: svc.name,
      platformHandled: svc.platformHandled || [],
      dashboardConfig: svc.dashboardConfig || [],
      devMustCode: svc.devMustCode || [],
    });
  }
  return found;
}

function detectPlatform(projectRoot) {
  for (const [file, platform] of Object.entries(signatures.platformFiles)) {
    if (fs.existsSync(path.join(projectRoot, file))) return platform;
  }
  return null;
}

// ─── Context assembly ────────────────────────────────────────────────────────

function prepare(projectRoot) {
  const filePaths = walkDir(projectRoot);

  // Read all code files
  const codeFiles = [];
  for (const file of filePaths) {
    try {
      const content = fs.readFileSync(file.absolute, 'utf-8');
      codeFiles.push({ relative: file.relative, absolute: file.absolute, content });
    } catch { /* unreadable — skip */ }
  }

  // Read package.json if present (needed for dependency-based detection fallback)
  let packageJson = null;
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  } catch { /* no package.json */ }

  const allContent = codeFiles.map(f => f.content).join('\n');
  const services = detectServices(codeFiles, packageJson);
  const managedServices = detectManagedServices(allContent);
  const platform = detectPlatform(projectRoot);

  // Build output (strip absolute paths)
  const outputFiles = codeFiles.map(f => ({ path: f.relative, content: f.content }));

  // Stats for context management
  const totalChars = codeFiles.reduce((sum, f) => sum + f.content.length, 0);

  return {
    services,
    managedServices,
    platform,
    packageJson,
    codeFiles: outputFiles,
    stats: {
      fileCount: codeFiles.length,
      totalChars,
      estimatedTokens: Math.ceil(totalChars / 4),
    },
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node prepare.js <project-dir>');
    process.exit(1);
  }
  const resolved = path.resolve(dir);
  if (!fs.existsSync(resolved)) {
    console.error(`Directory not found: ${resolved}`);
    process.exit(1);
  }

  const result = prepare(resolved);

  const anyDetected = Object.values(result.services).some(s => s.detected);
  if (!anyDetected && result.managedServices.length === 0) {
    console.error('No paid API services (SMS, Email, AI/LLM) detected.');
    process.exit(2);
  }

  // mode: "full" = direct paid APIs, "managed" = managed services only
  result.mode = anyDetected ? 'full' : 'managed';
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { prepare, walkDir, isCodeFile, shouldSkipBuiltOutput };
