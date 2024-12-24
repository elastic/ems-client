# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [8.6.3] - TBD
### Changed

## [8.6.2] - 2024-12-24
### Changed
- Downgraded chroma-js #526

## [8.6.1] - 2024-12-23
### Changed
- Removed node-fetch #519

## [8.6.0] - 2024-12-13
### Added
- Include color options for new EMS styles #478

### Changed
- Dependencies reorganization and validation against Kibana #289
- Update dependencies (search PRs for `is:pr label:8.5.4,dependencies`)

## [8.5.3] - 2024-07-10
### Changed
- Update dependencies #242

## [8.5.2] - 2024-07-05
## Changed
- Update dependencies #232 #233 #234 #235 

## [8.5.1] - 2023-11-09
### Added
- Add a new `getEmsVersion` method #204
- Include OpenAPI specification #196 #197

### Changed
- Update release documentation #194
- Update dependencies #198 #205
- Update resources for Buildkite build # 199
- Migration to Node 20 #208

## [8.5.0] - 2023-08-23
- Migration from Jenkins to Buildkite for automatic testing #145 #147
- Detached the releases of EMS Client from the services consumed #185
- Updated the client to support date based versions #185
- Update dependencies #159 #165 #173 #176 #181 #184

## [8.4.0] - 2023-01-11
- Default EMS version is 8.4
- Add types to colorOperationDefaults #123
- Update dependencies #131 #133 #134 #138

## [8.3.3] - 2022-05-24
- Make percentage an optional parameter #117
- Make color and operation optional parameters #118

## [8.3.2] - 2022-05-16
- Export `blendMode` type #111
- Fix transforming color definitions with stops #112

## [8.3.1] - 2022-05-06
- Added static methods to help translating basemap labels and blending colors to paint properties #105
- Add optional `format` argument to `getMinZoom` and `getMaxZoom` #90

## [8.3.0] - 2022-04-18
### Changed
 - Default EMS version is 8.3 #104
 - Bump maplibre-gl to 2.1.9 #103

## [8.2.0] - 2022-03-24
### Changed
 - Default EMS version is 8.2
 - Removed getOrigin method #91

## [8.1.0] - 2021-11-09
### Changed
 - Default EMS version is 8.1
 - Export EmsSprite and EmsSpritesheet types
 - Inherit types from maplibre-gl

## [8.0.0] - 2021-10-20
### Changed
 - Default EMS version is 8.0
 - Remove unused API descriptors

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
