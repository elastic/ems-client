# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [7.17.4] - 2024-12-16

### Changed
- Update dependencies (search PRs for `is:pr label:7.17.4,dependencies`)


## [7.17.3] - 2024-07-10
### Changed
- Update dependencies #243

## [7.17.2] - 2024-07-05
## Changed
- Update dependencies  #218 #219 #220 #221 #236 #237

## [7.17.1] - 2023-11-09
### Changed
- Default EMS version is 7.17
- Upgrade dependencies #138 #162 #165 #169 #172 #173 !76 #184 #191 #198 #205
- Migration from Jenkins to Buildkite for automatic testing #163 #199
- Upgrade to Node 20 #208

## [7.16.0] - 2021-10-13
### Changed
 - Default EMS version is 7.16
 - Update dependencies using `yarn upgrade`
 - Better error handling for HTTP responses

## [7.15.1] - 2021-09-01
### Changed
- Unpinned `semver` dependency [#77](https://github.com/elastic/ems-client/pull/77)

## [7.15.0] - 2021-08-12
### Changed
- Default EMS version is 7.15
- Updated dependencies via `yarn upgrade`
- Fix linting issues

## [7.14.0] - 2021-06-15
### Added
- New getters for optional field metadata `alias`, `regex`, and `values` #69

### Changed
- Default EMS version is 7.14
- **Breaking change** @elastic/ems-client is now licensed under the Elastic License v2. See the LICENSE.txt file in this repository #64

## [7.12.0] - 2020-02-08
### Changed
- Default EMS version is 7.12

## [7.11.0] - 2020-11-12
### Changed
- Default EMS version is 7.11
- Updated dependencies using `yarn upgrade` and #44 #50
- Add functions to get specific file formats #53

## [7.10.0] - 2020-08-17
### Changed
- Default EMS version is 7.10

## [7.9.4] - 2020-08-14
### Removed
- **Breaking change** The `getHTMLAttribution` method has been removed as clients should be responsible for creating HTML links.

## [7.9.3] - 2020-06-09
### Fixed
- Fixed type check issues by removing `@types/mapbox-gl` library

## [7.9.2] - 2020-06-05
### Added
- Added exports for the FileLayer and TMSService modules
- Added a `getFiles` method to FileLayer

## [7.9.1] - 2020-06-01
### Fixed
- Fixed regression of missing source type on vector tile styles

## [7.9.0] - 2020-05-29
### Changed
- Convert source code to Typescript
- Added better linting with eslint and prettier

## [7.8.1] - 2020-04-06
### Fixed
- Correctly handle API urls that end in slashes

## [7.8.0] - 2020-03-31
### Changed
- Moved `node-fetch` to dev dependency for testing instead of client dependency. It's not
always needed and in fact breaks some client-side use of this lib

## [7.7.2] - 2020-04-06
### Fixed
- Correctly handle API urls that end in slashes

## [7.7.1] - 2020-03-24
### Changed
- Updated dependencies using `yarn upgrade`

## [7.7.0] - 2020-03-11

### Changed
- The default Elastic Maps Service version is now `7.7`.

### Added
- The `appName` parameter can now be configured to specify the client application. Previously, the client application was hard-coded to `kibana`.
- The `appVersion` configurable parameter replaces the `kbnVersion` parameter for specifying the client application version, e.g. `7.7.0`.

### Deprecated
- The `kbnVersion` parameter has been deprecated and the `appVersion` parameter should be used instead.

## [7.6.1] - 2020-04-09
### Fixed
- Correctly handle API urls that end in slashes

## [7.6.0] - 2020-01-13
### Added
- Two new parameters were introduced, `tileApiUrl` and `fileApiUrl`. These should be used instead of `manifestServiceUrl`. These parameters should be set to their respective domains (e.g. `https://tiles.maps.elastic.co`, `https://vector.maps.elastic.co`). [#13](https://github.com/elastic/ems-client/pull/13)

### Changed
- Starting with v7.6, new Elastic Maps Service (EMS) versions will be released with every matching major and minor release of the Elastic Stack. New releases of ems-client will also be released to match the EMS versions.

- Handle relative URLs in EMS v7.6 manifests.

### Deprecated
- `manifestServiceUrl` is now deprecated as the catalogue manifest has been removed in Elastic Maps Service (EMS) v7.6. It has been replaced by two new parameters `tileApiUrl` and `fileApiUrl`.

## [7.2.2] - 2019-12-11
### Fixed
-  Remove paragraph element from html attribution [#15](https://github.com/elastic/ems-client/pull/15)

## [7.2.1] - 2019-12-11
### Fixed
- Inject correct attribution into vector tile sources [#14](https://github.com/elastic/ems-client/pull/14/files)

## [7.2.0] - 2019-11-12
Bump version to match the corresponding Elastic Maps Service version. This release does not introduce any changes.

## [1.0.5] - 2019-10-15
### Fixed
- Update browser entry point that was pointing to an incorrect path, which fell back to the main entry

## [1.0.2] - 2019-10-15
### Fixed
- Transpile the browser-side assets to be IE compatible.

## [1.0.1] - 2019-08-27
### Fixed
- Downgrade node-fetch dependency to fix fetch error

## [1.0.0] - 2019-08-26
- Initial release. Compatible with Elastic Maps Service v7.2.0.
