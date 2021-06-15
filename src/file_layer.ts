/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import {
  EMSClient,
  EmsFileLayerFormatGeoJson,
  EmsFileLayerFormatTopoJson,
  FileLayerConfig,
  FileLayerField,
} from './ems_client';
import { AbstractEmsService } from './ems_service';
import { FeatureCollection } from 'geojson';
import * as topojson from 'topojson-client';

export enum EMSFormatType {
  geojson = 'geojson',
  topojson = 'topojson',
}
export type EMSFormatTypeStrings = keyof typeof EMSFormatType;

type EMSFormats = EmsFileLayerFormatGeoJson | EmsFileLayerFormatTopoJson;

export class FileLayer extends AbstractEmsService {
  protected readonly _config: FileLayerConfig;

  constructor(config: FileLayerConfig, emsClient: EMSClient, proxyPath: string) {
    super(config, emsClient, proxyPath);
    this._config = config;
  }

  async getGeoJson(): Promise<FeatureCollection | undefined> {
    const cachedGeoJson = this._emsClient.getCachedGeoJson(this.getId());
    if (cachedGeoJson) {
      return cachedGeoJson;
    }

    const format = this.getDefaultFormatType();
    const fetchUrl = this.getDefaultFormatUrl();
    // let fetchedJson;
    let geojson;
    const fetchedJson = await this._emsClient.getManifest(fetchUrl);
    if (fetchedJson) {
      if (format === 'geojson') {
        geojson = (fetchedJson as unknown) as FeatureCollection;
      } else if (format === 'topojson') {
        const meta = this.getDefaultFormatMeta();
        const featureCollectionPath = meta?.feature_collection_path ?? 'data';
        // @ts-expect-error see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/52156
        geojson = topojson.feature(fetchedJson, featureCollectionPath) as FeatureCollection;
      } else {
        return;
      }
      this._emsClient.cacheGeoJson(this.getId(), geojson);
      return geojson;
    }
    return;
  }

  getFields(): FileLayerField[] {
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

  getFormatOfTypeMeta(
    type: EMSFormatTypeStrings
  ): { [key: string]: string | undefined; feature_collection_path?: string } | undefined {
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
