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
import fetch from 'node-fetch';
import semver from 'semver';
import { format as formatUrl, parse as parseUrl } from 'url';

const DEFAULT_EMS_VERSION = '7.7';

const extendUrl = (url, props) => modifyUrlLocal(url, parsed => _.merge(parsed, props));

/**
 * plugins cannot have upstream dependencies on core/*-kibana.
 * Work-around by copy-pasting modifyUrl routine here.
 * @param url
 * @param block
 */
function modifyUrlLocal(url, block) {

  const parsed = parseUrl(url, true);

  // copy over the most specific version of each
  // property. By default, the parsed url includes
  // several conflicting properties (like path and
  // pathname + search, or search and query) and keeping
  // track of which property is actually used when they
  // are formatted is harder than necessary
  const meaningfulParts = {
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
  });

}

/**
 *  Unescape a url template that was escaped by encodeURI() so leaflet
 *  will be able to correctly locate the variables in the template
 *  @param  {String} url
 *  @return {String}
 */
const unescapeTemplateVars = url => {
  const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
  return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
};


//this is not the default locale from Kibana, but the default locale supported by the Elastic Maps Service
const DEFAULT_LANGUAGE = 'en';

export class EMSClient {

  EMS_LOAD_TIMEOUT = 32000;

  constructor({
    kbnVersion,
    appVersion,
    appName,
    manifestServiceUrl,
    tileApiUrl,
    fileApiUrl,
    emsVersion,
    htmlSanitizer,
    language,
    landingPageUrl,
    fetchFunction,
    proxyPath,
  }) {

    // Remove kbnVersion in 8.0
    if (kbnVersion) {
      console.warn('The "kbnVersion" parameter for ems-client is deprecated. Please use "appVersion" instead.');
      appVersion = appVersion || kbnVersion;
    }

    this._queryParams = {
      elastic_tile_service_tos: 'agree',
      my_app_name: appName || 'kibana',
      my_app_version: appVersion,
    };

    this._sanitizer = htmlSanitizer ? htmlSanitizer : x => x;
    this._manifestServiceUrl = manifestServiceUrl;
    this._tileApiUrl = tileApiUrl;
    this._fileApiUrl = fileApiUrl;
    this._loadFileLayers = null;
    this._loadTMSServices = null;
    this._emsVersion = this._getEmsVersion(emsVersion);
    this._emsLandingPageUrl = typeof landingPageUrl === 'string' ? landingPageUrl : '';
    this._language = typeof language === 'string' ? language : DEFAULT_LANGUAGE;

    this._fetchFunction = typeof fetchFunction === 'function' ? fetchFunction : fetch;
    this._proxyPath = typeof proxyPath === 'string' ? proxyPath : '';

    this._invalidateSettings();
  }

  getDefaultLocale() {
    return DEFAULT_LANGUAGE;
  }

  getLocale() {
    return this._language;
  }

  getValueInLanguage(i18nObject) {
    if (!i18nObject) {
      return '';
    }
    return i18nObject[this._language] ? i18nObject[this._language] : i18nObject[DEFAULT_LANGUAGE];
  }

  _getEmsVersion(version) {
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
  async getManifest(manifestUrl) {
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

  _fetchWithTimeout(url) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Request to ${url} timed out`)),
        this.EMS_LOAD_TIMEOUT
      );
      this._fetchFunction(url).then(
        response => {
          clearTimeout(timer);
          resolve(response);
        },
        err => {
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
  addQueryParams(additionalQueryParams) {
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

  async _getManifestWithParams(url) {
    const extendedUrl = this.extendUrlWithParams(url);
    return await this.getManifest(extendedUrl);
  }

  _invalidateSettings() {
    this._getMainCatalog = _.once(async () => {
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
            manifest: `${this._tileApiUrl}/${this._emsVersion}/manifest`,
          });
        }
        if (this._fileApiUrl) {
          services.push({
            type: 'file',
            manifest: `${this._fileApiUrl}/${this._emsVersion}/manifest`,
          });
        }
        return { services: services };
      }
    });

    this._getDefaultTMSCatalog = _.once(async () => {
      const catalogue = await this._getMainCatalog();
      const firstService = catalogue.services.find(service => service.type === 'tms');
      if (!firstService) {
        return { services: [] };
      }
      const url = this._proxyPath + firstService.manifest;
      return await this.getManifest(url);
    });

    this._getDefaultFileCatalog = _.once(async () => {
      const catalogue = await this._getMainCatalog();
      const firstService = catalogue.services.find(service => service.type === 'file');
      if (!firstService) {
        return { layers: [] };
      }
      const url = this._proxyPath + firstService.manifest;
      return await this.getManifest(url);
    });

    //Cache the actual instances of TMSService as these in turn cache sub-manifests for the style-files
    this._loadTMSServices = _.once(async () => {
      const tmsManifest = await this._getDefaultTMSCatalog();
      return tmsManifest.services.map(
        serviceConfig => new TMSService(serviceConfig, this, this._proxyPath)
      );
    });

    this._loadFileLayers = _.once(async () => {
      const fileManifest = await this._getDefaultFileCatalog();
      return fileManifest.layers.map(
        layerConfig => new FileLayer(layerConfig, this, this._proxyPath)
      );
    });
  }

  async getMainManifest() {
    return await this._getMainCatalog();
  }

  async getDefaultFileManifest() {
    return await this._getDefaultFileCatalog();
  }

  async getDefaultTMSManifest() {
    return await this._getDefaultTMSCatalog();
  }

  async getFileLayers() {
    return await this._loadFileLayers();
  }

  async getTMSServices() {
    return await this._loadTMSServices();
  }

  getTileApiUrl() {
    return this._tileApiUrl;
  }

  getFileApiUrl() {
    return this._fileApiUrl;
  }

  getLandingPageUrl() {
    return this._emsLandingPageUrl;
  }

  sanitizeHtml(html) {
    return this._sanitizer(html);
  }

  extendUrlWithParams(url) {
    return unescapeTemplateVars(
      extendUrl(url, {
        query: this._queryParams,
      })
    );
  }

  async findFileLayerById(id) {
    const fileLayers = await this.getFileLayers();
    for (let i = 0; i < fileLayers.length; i++) {
      if (fileLayers[i].hasId(id)) {
        return fileLayers[i];
      }
    }
  }

  async findTMSServiceById(id) {
    const tmsServices = await this.getTMSServices();
    for (let i = 0; i < tmsServices.length; i++) {
      if (tmsServices[i].hasId(id)) {
        return tmsServices[i];
      }
    }
  }


}
