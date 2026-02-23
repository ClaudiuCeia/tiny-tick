# Publishing

This project publishes to npm from GitHub Actions on `v*` tags.

## One-time setup

1. Add repository secret `NPM_TOKEN` with publish access to `@claudiu-ceia/tiny-tick`.
2. Ensure repository URL/owner in `package.json` is correct.

## Release checklist

1. Update version in `package.json`.
2. Run local verification:

```bash
bun install
bun run check
```

3. Commit and push.
4. Create and push tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## CI/CD behavior

On tag push, workflow will:

1. Verify tag version matches `package.json` version.
2. Install dependencies with Bun.
3. Run `bun run check`.
4. Publish to npm with provenance.
5. Create a GitHub release with generated notes.
