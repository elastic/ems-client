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

import { ORIGIN } from './origin';
import url from 'url';
import { toAbsoluteUrl } from './utils';
import {
  EMSClient,
  IFileLayer,
  EmsFileLayerFormatGeoJson,
  EmsFileLayerFormatTopoJson,
} from './ems_client';

export class FileLayer {
  private readonly _emsClient: EMSClient;
  private readonly _config: IFileLayer;
  private readonly _proxyPath: string;
  /**
   * Checks if url is absolute. If not, prepend the basePath.
   */
  _getAbsoluteUrl = (url: string) => {
    if (/^https?:\/\//.test(url)) {
      return url;
    } else {
      return toAbsoluteUrl(this._emsClient.getFileApiUrl(), url);
    }
  };

  constructor(config: IFileLayer, emsClient: EMSClient, proxyPath: string) {
    this._config = config;
    this._emsClient = emsClient;
    this._proxyPath = proxyPath;
  }

  getAttributions(): { url: string; label: string }[] {
    return this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return {
        url: url,
        label: label,
      };
    });
  }

  getHTMLAttribution(): string {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      const html = url ? `<a href=${url}>${label}</a>` : label;
      return this._emsClient.sanitizeHtml(html);
    });
    return attributions.join(' | '); //!!!this is the current convention used in Kibana
  }

  getFieldsInLanguage(): { type: string; name: string; description: string }[] {
    return this._config.fields.map(field => {
      return {
        type: field.type,
        name: field.id,
        description: this._emsClient.getValueInLanguage(field.label),
      };
    });
  }

  getDisplayName(): string {
    const layerName = this._emsClient.getValueInLanguage(this._config.layer_name);
    return layerName ? layerName : '';
  }

  getId(): string {
    return this._config.layer_id;
  }

  hasId(id: string): boolean {
    const matchesLegacyId = this._config.legacy_ids.indexOf(id) >= 0;
    return this._config.layer_id === id || matchesLegacyId;
  }

  _getDefaultFormat(): EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson {
    const defaultFormat = this._config.formats.find(format => {
      return format.legacy_default;
    });
    if (defaultFormat) {
      return defaultFormat;
    }
    return this._config.formats[0];
  }

  getEMSHotLink(): string {
    const landingPageString = this._emsClient.getLandingPageUrl();
    const urlObject = url.parse(landingPageString, true);
    urlObject.hash = `file/${this.getId()}`;
    urlObject.query = {
      ...urlObject.query,
      locale: this._emsClient.getLocale(),
    };
    return url.format(urlObject);
  }

  getDefaultFormatType(): string {
    const format = this._getDefaultFormat();
    return format.type;
  }

  getDefaultFormatMeta(): { [key: string]: string } | undefined {
    const format = this._getDefaultFormat();
    if ('meta' in format) {
      return format.meta;
    } else {
      return;
    }
  }

  getDefaultFormatUrl(): string {
    const format = this._getDefaultFormat();
    const url = this._proxyPath + this._getAbsoluteUrl(format.url);
    return this._emsClient.extendUrlWithParams(url);
  }

  getCreatedAt(): string {
    return this._config.created_at;
  }

  getOrigin(): string {
    return ORIGIN.EMS;
  }
}
