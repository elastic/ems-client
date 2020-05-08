/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { TMSService } from './tms_service';
import { FileLayer } from './file_layer';
import semver from 'semver';
import { format as formatUrl, parse as parseUrl, UrlObject } from 'url';
import { toAbsoluteUrl } from './utils';
import { ParsedUrlQueryInput } from 'querystring';

const DEFAULT_EMS_VERSION = '7.8';

interface URLMeaningfulParts {
  auth?: string | null;
  hash?: string | null;
  hostname?: string | null;
  pathname?: string | null;
  protocol?: string | null;
  slashes?: boolean | null;
  port?: string | null;
  query: ParsedUrlQueryInput;
}

const extendUrl = (url: string, props: URLMeaningfulParts) =>
  modifyUrlLocal(url, parsed => _.merge(parsed, props));

/**
 * plugins cannot have upstream dependencies on core/*-kibana.
 * Work-around by copy-pasting modifyUrl routine here.
 * @param url
 * @param block
 */
function modifyUrlLocal(
  url: string,
  block: (urlParts: URLMeaningfulParts) => Partial<URLMeaningfulParts> | void
): string {
  const parsed = parseUrl(url, true) as URLMeaningfulParts;

  // copy over the most specific version of each
  // property. By default, the parsed url includes
  // several conflicting properties (like path and
  // pathname + search, or search and query) and keeping
  // track of which property is actually used when they
  // are formatted is harder than necessary
  const meaningfulParts: URLMeaningfulParts = {
    protocol: parsed.protocol,
    slashes: parsed.slashes,
    auth: parsed.auth,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    query: parsed.query || {},
    hash: parsed.hash,
  };

  // the block modifies the meaningfulParts object, or returns a new one
  const modifiedParts = block(meaningfulParts) || meaningfulParts;

  // format the modified/replaced meaningfulParts back into a url
  return formatUrl({
    protocol: modifiedParts.protocol,
    slashes: modifiedParts.slashes,
    auth: modifiedParts.auth,
    hostname: modifiedParts.hostname,
    port: modifiedParts.port,
    pathname: modifiedParts.pathname,
    query: modifiedParts.query,
    hash: modifiedParts.hash,
  } as UrlObject);
}

/**
 *  Unescape a url template that was escaped by encodeURI() so leaflet
 *  will be able to correctly locate the variables in the template
 *  @param  {String} url
 *  @return {String}
 */
const unescapeTemplateVars = (url: string) => {
  const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
  return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
};

type LocalizedStrings = { [key: string]: string };

interface BaseClientConfig {
  appName?: string;
  manifestServiceUrl: string;
  tileApiUrl: string;
  fileApiUrl: string;
  emsVersion?: string;
  htmlSanitizer?: Function;
  language?: string;
  landingPageUrl?: string;
  fetchFunction: Function;
  proxyPath?: string;
}

interface DeprecatedClientConfig extends BaseClientConfig {
  kbnVersion: string;
}

interface ClientConfig extends BaseClientConfig {
  appVersion: string;
}

interface EmsCatalogService {
  id?: string;
  name?: string;
  manifest: string;
  type: string;
}

interface EmsCatalogManifest {
  version?: string;
  services: EmsCatalogService[];
}

interface EmsTmsCatalog {
  version?: string;
  services: ITMSService[];
}

export interface ITMSService {
  id: string;
  name: {
    en: string;
  };
  attribution: EmsLayerAttribution[];
  formats: {
    locale: string;
    format: string;
    url: string;
  }[];
}

interface EmsFileCatalog {
  version?: string;
  layers: IFileLayer[];
}

export interface EmsLayerAttribution {
  label: LocalizedStrings;
  url: LocalizedStrings;
}

export interface EmsFileLayerFormatGeoJson {
  type: 'geojson';
  url: string;
  legacy_default: boolean;
}

export interface EmsFileLayerFormatTopoJson {
  type: 'topojson';
  url: string;
  legacy_default: boolean;
  meta: {
    feature_collection_path: string;
  };
}

export interface IFileLayer {
  layer_id: string;
  created_at: string;
  attribution: EmsLayerAttribution[];
  formats: (EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson)[];
  fields: {
    type: string;
    id: string;
    label: LocalizedStrings;
  }[];
  legacy_ids: string[];
  layer_name: LocalizedStrings;
}

interface QueryParams {
  elastic_tile_service_tos: string;
  my_app_name: string;
  my_app_version: string;
  [key: string]: string;
}

//this is not the default locale from Kibana, but the default locale supported by the Elastic Maps Service
const DEFAULT_LANGUAGE = 'en';

export class EMSClient {
  readonly EMS_LOAD_TIMEOUT = 32000;
  private _queryParams: QueryParams;
  private readonly _appVersion: string;
  private readonly _fetchFunction: Function;
  private readonly _sanitizer: Function;
  private readonly _manifestServiceUrl: string;
  private readonly _fileApiUrl: string;
  private readonly _tileApiUrl: string;
  private readonly _emsVersion: string;
  private readonly _emsLandingPageUrl: string;
  private readonly _language: string;
  private readonly _proxyPath: string;

  /**
   * these methods are assigned outside the constructor
   */
  private _getMainCatalog!: Function;
  private _getDefaultTMSCatalog!: Function;
  private _getDefaultFileCatalog!: Function;
  private _loadTMSServices!: Function;
  private _loadFileLayers!: Function;

  constructor(config: ClientConfig | DeprecatedClientConfig) {
    // Remove kbnVersion in 8.0
    if ('kbnVersion' in config) {
      console.warn(
        'The "kbnVersion" parameter for ems-client is deprecated. Please use "appVersion" instead.'
      );
      this._appVersion = config.kbnVersion;
    } else {
      this._appVersion = config.appVersion;
    }

    this._queryParams = {
      elastic_tile_service_tos: 'agree',
      my_app_name: config.appName || 'kibana',
      my_app_version: this._appVersion,
    };

    this._sanitizer = config.htmlSanitizer ? config.htmlSanitizer : (x: string) => x;
    this._manifestServiceUrl = config.manifestServiceUrl;
    this._tileApiUrl = config.tileApiUrl;
    this._fileApiUrl = config.fileApiUrl;
    this._emsVersion = this._getEmsVersion(config.emsVersion);
    this._emsLandingPageUrl = config.landingPageUrl || '';
    this._language = config.language || DEFAULT_LANGUAGE;

    this._fetchFunction = config.fetchFunction;
    this._proxyPath = config.proxyPath || '';

    this._invalidateSettings();
  }

  getDefaultLocale() {
    return DEFAULT_LANGUAGE;
  }

  getLocale() {
    return this._language;
  }

  getValueInLanguage(i18nObject: { [language: string]: any }) {
    if (!i18nObject) {
      return '';
    }
    return i18nObject[this._language] ? i18nObject[this._language] : i18nObject[DEFAULT_LANGUAGE];
  }

  _getEmsVersion(version: string | undefined) {
    const userVersion = semver.valid(semver.coerce(version));
    const semverVersion = userVersion ? userVersion : semver.coerce(DEFAULT_EMS_VERSION);
    if (semverVersion) {
      return `v${semver.major(semverVersion)}.${semver.minor(semverVersion)}`;
    } else {
      throw new Error(`Invalid version: ${version}`);
    }
  }

  /**
   * this internal method is overridden by the tests to simulate custom manifest.
   */
  async getManifest(manifestUrl: string) {
    try {
      const url = extendUrl(manifestUrl, { query: this._queryParams });
      const result = await this._fetchWithTimeout(url);
      return result ? await result.json() : null;
    } catch (e) {
      if (!e) {
        e = new Error('Unknown error');
      }
      if (!(e instanceof Error)) {
        e = new Error(e.data || `status ${e.statusText || e.status}`);
      }
      throw new Error(`Unable to retrieve manifest from ${manifestUrl}: ${e.message}`);
    }
  }

  _fetchWithTimeout(url: string): Promise<Body> {
    return new Promise<Body>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Request to ${url} timed out`)),
        this.EMS_LOAD_TIMEOUT
      );
      this._fetchFunction(url).then(
        (response: Body) => {
          clearTimeout(timer);
          resolve(response);
        },
        (err: Error) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /**
   * Add optional query-parameters to all requests
   *
   * @param additionalQueryParams
   */
  addQueryParams(additionalQueryParams: { [key: string]: string }) {
    for (const key in additionalQueryParams) {
      if (additionalQueryParams.hasOwnProperty(key)) {
        if (additionalQueryParams[key] !== this._queryParams[key]) {
          //changes detected.
          this._queryParams = _.assign({}, this._queryParams, additionalQueryParams);
          this._invalidateSettings();
          break;
        }
      }
    }
  }

  async _getManifestWithParams(url: string) {
    const extendedUrl = this.extendUrlWithParams(url);
    return await this.getManifest(extendedUrl);
  }

  _invalidateSettings(): void {
    this._getMainCatalog = _.once(
      async (): Promise<EmsCatalogManifest> => {
        // Preserve manifestServiceUrl parameter for backwards compatibility with EMS v7.2
        if (this._manifestServiceUrl) {
          console.warn(`The "manifestServiceUrl" parameter is deprecated in v7.6.0.
        Consider using "tileApiUrl" and "fileApiUrl" instead.`);
          return await this._getManifestWithParams(this._manifestServiceUrl);
        } else {
          const services = [];
          if (this._tileApiUrl) {
            services.push({
              type: 'tms',
              manifest: toAbsoluteUrl(this._tileApiUrl, `${this._emsVersion}/manifest`),
            });
          }
          if (this._fileApiUrl) {
            services.push({
              type: 'file',
              manifest: toAbsoluteUrl(this._fileApiUrl, `${this._emsVersion}/manifest`),
            });
          }
          return { services: services };
        }
      }
    );

    this._getDefaultTMSCatalog = _.once(
      async (): Promise<EmsTmsCatalog> => {
        const catalogue = await this._getMainCatalog();
        const firstService = catalogue.services.find(
          (service: EmsCatalogService) => service.type === 'tms'
        );
        if (!firstService) {
          return { services: [] };
        }
        const url = this._proxyPath + firstService.manifest;
        return await this.getManifest(url);
      }
    );

    this._getDefaultFileCatalog = _.once(
      async (): Promise<EmsFileCatalog> => {
        const catalogue = await this._getMainCatalog();
        const firstService = catalogue.services.find(
          (service: EmsCatalogService) => service.type === 'file'
        );
        if (!firstService) {
          return { layers: [] };
        }
        const url = this._proxyPath + firstService.manifest;
        return await this.getManifest(url);
      }
    );

    //Cache the actual instances of TMSService as these in turn cache sub-manifests for the style-files
    this._loadTMSServices = _.once(async (): Promise<ITMSService[]> => {
      const tmsManifest = await this._getDefaultTMSCatalog();
      return tmsManifest.services.map(
        (serviceConfig: ITMSService) => new TMSService(serviceConfig, this, this._proxyPath)
      );
    });

    this._loadFileLayers = _.once(async (): Promise<IFileLayer[]> => {
      const fileManifest = await this._getDefaultFileCatalog();
      return fileManifest.layers.map(
        (layerConfig: IFileLayer) => new FileLayer(layerConfig, this, this._proxyPath)
      );
    });
  }

  async getMainManifest(): Promise<EmsCatalogManifest> {
    return await this._getMainCatalog();
  }

  async getDefaultFileManifest(): Promise<EmsFileCatalog> {
    return await this._getDefaultFileCatalog();
  }

  async getDefaultTMSManifest(): Promise<EmsTmsCatalog> {
    return await this._getDefaultTMSCatalog();
  }

  async getFileLayers(): Promise<FileLayer[]> {
    return await this._loadFileLayers();
  }

  async getTMSServices(): Promise<TMSService[]> {
    return await this._loadTMSServices();
  }

  getTileApiUrl(): string {
    return this._tileApiUrl;
  }

  getFileApiUrl(): string {
    return this._fileApiUrl;
  }

  getLandingPageUrl(): string {
    return this._emsLandingPageUrl;
  }

  sanitizeHtml(html: string): string {
    return this._sanitizer(html);
  }

  extendUrlWithParams(url: string): string {
    return unescapeTemplateVars(
      extendUrl(url, {
        query: this._queryParams,
      })
    );
  }

  async findFileLayerById(id: string): Promise<FileLayer | undefined> {
    const fileLayers = await this.getFileLayers();
    for (let i = 0; i < fileLayers.length; i++) {
      if (fileLayers[i].hasId(id)) {
        return fileLayers[i];
      }
    }
  }

  async findTMSServiceById(id: string): Promise<TMSService | undefined> {
    const tmsServices = await this.getTMSServices();
    for (let i = 0; i < tmsServices.length; i++) {
      if (tmsServices[i].hasId(id)) {
        return tmsServices[i];
      }
    }
  }
}
