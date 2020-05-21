# Contributing to @elastic/ems-client

## Releasing

Releases for @elastic/ems-client must match the corresponding minor version of Elastic Maps Service (EMS). Patch releases (e.g. v7.2.1) can be created for bug fixes.

> ℹ️ Elastic Maps Service may not have minor releases. For example, there are no v7.1 or v7.3 releases for EMS. So @elastic/ems-client may also skip minor releases.


If you have access to make releases, the process is as follows:

1. Be sure you have checked out the `master` branch and have pulled latest changes
1. Update the version in `package.json` according to the corresponding minor version of Elastic Maps Service.
1. If necessary, update the `DEFAULT_EMS_VERSION` constant in `ems_client.js`.
1. Update the CHANGELOG.md
1. Commit changes with message "bump to x.y.z" where x.y.z is the version in package.json
1. Tag the commit with `git tag vx.y.x`, for example `git tag v7.2.1`
1. Push commits and tags upstream with `git push upstream master && git push upstream --tags` (and optionally to your own fork as well)
1. Update the latest major branch on upstream with `git push upstream <major_branch>`
1. Build the targets with `yarn build`
1. Publish to npm with `npm publish --access public`
