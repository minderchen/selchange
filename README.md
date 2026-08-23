# I Ching Journal

React + Vite app for the SEL I Ching learning journal.

## User Guide

繁體中文操作說明請見 [使用指南](使用指南.md)。

## Deploy To GitHub Pages

This project is configured to deploy with gh-pages.

1. Create GitHub repository minderchen/selchange (if it does not exist yet).
2. In this folder, install dependencies.
3. Build and publish with the deploy script.

Commands:

npm install
npm run deploy

What the deploy script does:

- Runs build and outputs files to dist.
- Publishes dist to branch gh-pages.

After deploy:

- Open repository Settings > Pages.
- Set Source to Deploy from a branch.
- Select branch gh-pages and folder /(root).
- Your site URL will be https://minderchen.github.io/selchange/.

If push fails with "Repository not found":

- Confirm the repository exists under the minderchen account.
- Confirm origin is set to https://github.com/minderchen/selchange.git.
- Authenticate git push with your GitHub account and token.
