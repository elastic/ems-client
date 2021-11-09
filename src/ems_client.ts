/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { TMSService } from './tms_service';
import { EMSFormatType, FileLayer } from './file_layer';
import { FeatureCollection } from 'geojson';
import { Response } from 'node-fetch';
import semver from 'semver';
import { format as formatUrl, parse as parseUrl, UrlObject } from 'url';
import { toAbsoluteUrl } from './utils';
import { ParsedUrlQueryInput } from 'querystring';
import LRUCache from 'lru-cache';

const DEFAULT_EMS_VERSION = '8.1';

type URLMeaningfulParts = {
  auth?: string | null;
  hash?: string | null;
  hostname?: string | null;
  pathname?: string | null;
  protocol?: string | null;
  slashes?: boolean | null;
  port?: string | null;
  query: ParsedUrlQueryInput;
};

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

const extendUrl = (url: string, props: URLMeaningfulParts) =>
  modifyUrlLocal(url, (parsed) => _.merge(parsed, props));

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

type BaseClientConfig = {
  appName?: string;
  manifestServiceUrl?: string;
  tileApiUrl: string;
  fileApiUrl: string;
  emsVersion?: string;
  htmlSanitizer?: Function;
  language?: string;
  landingPageUrl?: string;
  fetchFunction: Function;
  proxyPath?: string;
  cacheSize?: number;
};

type DeprecatedClientConfig = BaseClientConfig & {
  kbnVersion: string;
};

type ClientConfig = BaseClientConfig & {
  appVersion: string;
};

type EmsCatalogService = {
  id?: string;
  name?: string;
  manifest: string;
  type: string;
};

type EmsCatalogManifest = {
  version?: string;
  services: EmsCatalogService[];
};

type EmsTmsCatalog = {
  version?: string;
  services: TMSServiceConfig[];
};

export type EmsTmsFormat = {
  locale: string;
  format: string;
  url: string;
};

export type BaseEmsServiceConfig = {
  attribution: EmsLayerAttribution[];
};

export type FileLayerConfig = BaseEmsServiceConfig & {
  layer_id: string;
  created_at: string;
  formats: (EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson)[];
  fields: FileLayerField[];
  legacy_ids: string[];
  layer_name: LocalizedStrings;
};

export type FileLayerField = {
  type: string;
  id: string;
  label: LocalizedStrings;
  values?: string[];
  regex?: string;
  alias?: string[];
};

export type TMSServiceConfig = BaseEmsServiceConfig & {
  id: string;
  name: {
    en: string;
  };
  formats: EmsTmsFormat[];
};

type EmsFileCatalog = {
  version?: string;
  layers: FileLayerConfig[];
};

export type EmsLayerAttribution = {
  label: LocalizedStrings;
  url: LocalizedStrings;
};

export type EmsFileLayerFormatGeoJson = {
  type: EMSFormatType.geojson;
  url: string;
  legacy_default: boolean;
};

export type EmsFileLayerFormatTopoJson = {
  type: EMSFormatType.topojson;
  url: string;
  legacy_default: boolean;
  meta: {
    feature_collection_path: string;
  };
};

type QueryParams = {
  [key: string]: string;
  elastic_tile_service_tos: string;
  my_app_name: string;
  my_app_version: string;
};

//this is not the default locale from Kibana, but the default locale supported by the Elastic Maps Service
const DEFAULT_LANGUAGE = 'en';

export class EMSClient {
  readonly EMS_LOAD_TIMEOUT = 32000;
  private _queryParams: QueryParams;
  private readonly _appVersion: string;
  private readonly _fetchFunction: Function;
  private readonly _sanitizer: Function;
  private readonly _manifestServiceUrl?: string;
  private readonly _fileApiUrl: string;
  private readonly _tileApiUrl: string;
  private readonly _emsVersion: string;
  private readonly _emsLandingPageUrl: string;
  private readonly _language: string;
  private readonly _proxyPath: string;
  private readonly _cache: LRUCache<string, FeatureCollection>;

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
    this._cache = new LRUCache<string, FeatureCollection>({
      max: config.cacheSize || 10,
    });

    this._invalidateSettings();
  }

  getDefaultLocale(): string {
    return DEFAULT_LANGUAGE;
  }

  getLocale(): string {
    return this._language;
  }

  getValueInLanguage(i18nObject: { [language: string]: string }) {
    if (!i18nObject) {
      return '';
    }
    return i18nObject[this._language] ? i18nObject[this._language] : i18nObject[DEFAULT_LANGUAGE];
  }

  /**
   * this internal method is overridden by the tests to simulate custom manifest.
   */
  async getManifest<T>(endpointUrl: string): Promise<T> {
    try {
      const url = extendUrl(endpointUrl, { query: this._queryParams });
      const response = await this._fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response ? await response.json() : null;
    } catch (e) {
      if (e instanceof Error) {
        throw e;
      } else {
        throw new Error('Unknown error');
      }
    }
  }

  /**
   * Add optional query-parameters to all requests
   *
   * @param additionalQueryParams
   */
  addQueryParams(additionalQueryParams: { [key: string]: string }): void {
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

  cacheGeoJson(layerId: string, geoJson: FeatureCollection): void {
    this._cache.set(layerId, geoJson);
    return;
  }

  getCachedGeoJson(layerId: string) {
    return this._cache.get(layerId);
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

  private _getEmsVersion(version: string | undefined): string {
    const userVersion = semver.valid(semver.coerce(version));
    const semverVersion = userVersion ? userVersion : semver.coerce(DEFAULT_EMS_VERSION);
    if (semverVersion) {
      return `v${semver.major(semverVersion)}.${semver.minor(semverVersion)}`;
    } else {
      throw new Error(`Invalid version: ${version}`);
    }
  }

  private _fetchWithTimeout(url: string): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Request to ${url} timed out`)),
        this.EMS_LOAD_TIMEOUT
      );
      this._fetchFunction(url).then(
        (response: Response) => {
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

  private async _getManifestWithParams<T>(url: string): Promise<T> {
    const extendedUrl = this.extendUrlWithParams(url);
    return await this.getManifest(extendedUrl);
  }

  private _invalidateSettings(): void {
    this._cache.reset();
    this._getMainCatalog = _.once(async (): Promise<EmsCatalogManifest> => {
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
    });

    this._getDefaultTMSCatalog = _.once(async (): Promise<EmsTmsCatalog> => {
      const catalogue = await this._getMainCatalog();
      const firstService = catalogue.services.find(
        (service: EmsCatalogService) => service.type === 'tms'
      );
      if (!firstService) {
        return { services: [] };
      }
      const url = this._proxyPath + firstService.manifest;
      return await this.getManifest(url);
    });

    this._getDefaultFileCatalog = _.once(async (): Promise<EmsFileCatalog> => {
      const catalogue = await this._getMainCatalog();
      const firstService = catalogue.services.find(
        (service: EmsCatalogService) => service.type === 'file'
      );
      if (!firstService) {
        return { layers: [] };
      }
      const url = this._proxyPath + firstService.manifest;
      return await this.getManifest(url);
    });

    //Cache the actual instances of TMSService as these in turn cache sub-manifests for the style-files
    this._loadTMSServices = _.once(async (): Promise<TMSService[]> => {
      const tmsManifest = await this._getDefaultTMSCatalog();
      return tmsManifest.services.map(
        (serviceConfig: TMSServiceConfig) => new TMSService(serviceConfig, this, this._proxyPath)
      );
    });

    this._loadFileLayers = _.once(async (): Promise<FileLayer[]> => {
      const fileManifest = await this._getDefaultFileCatalog();
      return fileManifest.layers.map(
        (layerConfig: FileLayerConfig) => new FileLayer(layerConfig, this, this._proxyPath)
      );
    });
  }
}
