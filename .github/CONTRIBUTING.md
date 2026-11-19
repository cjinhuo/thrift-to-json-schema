# Contributing

Use the Node.js version in `.nvmrc` and the pnpm version in the root `package.json`. Install workspace dependencies and browser runtimes before running the checks.

```sh
pnpm install --frozen-lockfile
pnpm --filter @trasm/e2e exec playwright install chromium firefox webkit
pnpm verify
```

Use `pnpm web:dev` for the parser demo and `pnpm test:watch` while editing the SDK. Keep shared dependency versions in the pnpm catalog and commit the root lockfile. Husky runs Biome against staged files and checks Conventional Commit messages.

## Releases

Changes to the public packages `@trasm/shared` and `@trasm/thrift-jsma` that affect consumers need a changeset. Run `pnpm changeset` to add one and `pnpm changeset:status` to inspect the release plan.

Stable and beta npm releases use the manually triggered GitHub Actions workflows. Configure the repository's npm publishing token as `NPM_TOKEN` for these workflows. The Pages workflow builds the demo on pushes to `master`.
