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
import url from 'url';
import {
  EMSClient,
  EmsFileLayerFormatGeoJson,
  EmsFileLayerFormatTopoJson,
  FileLayerConfig,
} from './ems_client';
import { AbstractEmsService } from './ems_service';
import { FeatureCollection } from 'geojson';
import { TopoJSON } from 'topojson-specification';

export enum EMSFormatType {
  geojson = 'geojson',
  topojson = 'topojson',
}
export type EMSFormatTypeStrings = keyof typeof EMSFormatType;

type EMSFormats = EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson;

export class FileLayer extends AbstractEmsService {
  protected readonly _config: FileLayerConfig;

  private _getVectorDataOfType = _.memoize(
    async (format: EMSFormatTypeStrings): Promise<FeatureCollection | TopoJSON | undefined> => {
      const fileUrl = this.getFormatOfTypeUrl(format);
      if (fileUrl) {
        const vectorJson = await this._emsClient.getJsonEndpoint<
          FeatureCollection | TopoJSON | undefined
        >(fileUrl);
        return vectorJson;
      } else {
        return;
      }
    }
  );

  constructor(config: FileLayerConfig, emsClient: EMSClient, proxyPath: string) {
    super(config, emsClient, proxyPath);
    this._config = config;
  }

  async getVectorDataOfType(
    format: EMSFormatTypeStrings
  ): Promise<FeatureCollection | TopoJSON | undefined> {
    return await this._getVectorDataOfType(format);
  }

  getFields(): FileLayerConfig['fields'] {
    return this._config.fields;
  }

  getFieldsInLanguage(): { type: string; name: string; description: string }[] {
    return this.getFields().map((field) => {
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

  getFormatOfType(type: EMSFormatTypeStrings): EMSFormatTypeStrings {
    const format = this._getFormatOfType(type);
    return format.type;
  }

  getDefaultFormatMeta(): { [key: string]: string } | undefined {
    const format = this._getDefaultFormat();
    return this._getFormatMeta(format);
  }

  getFormatOfTypeMeta(type: EMSFormatTypeStrings): { [key: string]: string } | undefined {
    const format = this._getFormatOfType(type);
    return this._getFormatMeta(format);
  }

  getDefaultFormatUrl(): string {
    const format = this._getDefaultFormat();
    return this._getFormatUrl(format);
  }

  getFormatOfTypeUrl(type: EMSFormatTypeStrings) {
    const format = this._getFormatOfType(type);
    return this._getFormatUrl(format);
  }

  getCreatedAt(): string {
    return this._config.created_at;
  }

  getApiUrl(): string {
    return this._emsClient.getFileApiUrl();
  }

  private _getFormatUrl(format: EMSFormats) {
    const url = this._proxyPath + this._getAbsoluteUrl(format.url);
    return this._emsClient.extendUrlWithParams(url);
  }

  private _getFormatMeta(format: EMSFormats) {
    if ('meta' in format) {
      return format.meta;
    } else {
      return;
    }
  }

  private _getDefaultFormat(): EMSFormats {
    const defaultFormat = this._config.formats.find((format) => {
      return format.legacy_default;
    });
    if (defaultFormat) {
      return defaultFormat;
    }
    return this._config.formats[0];
  }

  private _getFormatOfType(type: EMSFormatTypeStrings): EMSFormats {
    const requestedFormat = this._config.formats.find((format) => {
      return format.type === type;
    });
    return requestedFormat || this._getDefaultFormat();
  }
}
