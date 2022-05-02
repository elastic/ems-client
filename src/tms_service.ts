/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import {
  DataDrivenPropertyValueSpecification,
  FormattedSpecification,
  LayerSpecification,
  StyleSpecification,
  VectorSourceSpecification,
} from 'maplibre-gl';
import { EMSClient, EmsTmsFormat, TMSServiceConfig } from './ems_client';
import { AbstractEmsService } from './ems_service';
import { layerPaintProperty, colorizeColor, blendMode, mbColorDefinition } from './utils';

export type EmsSprite = {
  height: number;
  pixelRatio: number;
  width: number;
  x: number;
  y: number;
  sdf?: boolean;
};

export type EmsSpriteSheet = {
  [spriteName: string]: EmsSprite;
};

type EmsVectorSources = {
  [sourceName: string]: VectorSourceSpecification;
};

export type EmsVectorStyle = StyleSpecification & {
  sources: EmsVectorSources;
};

type EmsRasterStyle = {
  tilejson: string;
  name: string;
  attribution: string;
  minzoom: number;
  maxzoom: number;
  bounds: number[];
  format: string;
  type: string;
  tiles: string[];
  center: number[];
};

export class TMSService extends AbstractEmsService {
  /*
  List of supported languages with labels and OMT code
  */
  public static SupportedLanguages = {
    en: { label: 'English', omtCode: 'en' },
    'ch-CN': { label: 'Chinese', omtCode: 'zh' },
    'ja-JP': { label: 'Japanese', omtCode: 'ja' },
    'fr-FR': { label: 'French', omtCode: 'fr' },
    es: { label: 'Spanish', omtCode: 'es' },
    ar: { label: 'Arabic', omtCode: 'ar' },
    'hi-IN': { label: 'Hindi', omtCode: 'hi' },
    'ru-RU': { label: 'Russian', omtCode: 'ru' },
    'pt-PT': { label: 'Portuguese', omtCode: 'pt' },
    it: { label: 'Italian', omtCode: 'it' },
    de: { label: 'German', omtCode: 'de' },
    ko: { label: 'Korean', omtCode: 'ko' },
  };

  protected readonly _config: TMSServiceConfig;

  private _getRasterStyleJson = _.once(async (): Promise<EmsRasterStyle | undefined> => {
    const rasterUrl = this._getStyleUrlForLocale('raster');
    if (rasterUrl) {
      const url = this._proxyPath + this._getAbsoluteUrl(rasterUrl);
      return this._emsClient.getManifest<EmsRasterStyle>(this._emsClient.extendUrlWithParams(url));
    } else {
      return;
    }
  });

  private _getVectorStyleJsonRaw = _.once(async (): Promise<EmsVectorStyle | undefined> => {
    const vectorUrl = this._getStyleUrlForLocale('vector');
    if (vectorUrl) {
      const url = this._proxyPath + this._getAbsoluteUrl(vectorUrl);
      const vectorJson = await this._emsClient.getManifest<EmsVectorStyle>(
        this._emsClient.extendUrlWithParams(url)
      );
      return { ...vectorJson };
    } else {
      return;
    }
  });

  private _getVectorStyleJsonInlined = _.once(async (): Promise<EmsVectorStyle | undefined> => {
    const vectorJson = await this._getVectorStyleJsonRaw();
    if (vectorJson) {
      const inlinedSources: EmsVectorSources = {};
      const { sources } = vectorJson;
      for (const sourceName of Object.getOwnPropertyNames(sources)) {
        const { url } = sources[sourceName];
        if (url) {
          const sourceUrl = this._proxyPath + this._getAbsoluteUrl(url);
          const extendedUrl = this._emsClient.extendUrlWithParams(sourceUrl);
          const sourceJson = await this._emsClient.getManifest<VectorSourceSpecification>(
            extendedUrl
          );
          const tiles = sourceJson?.tiles?.map((tileUrl) => {
            const directUrl = this._proxyPath + this._getAbsoluteUrl(tileUrl);
            return this._emsClient.extendUrlWithParams(directUrl);
          });
          inlinedSources[sourceName] = {
            ...sourceJson,
            type: 'vector',
            tiles,
          };
        }
      }
      return {
        ...vectorJson,
        sources: inlinedSources,
        sprite: await this._getSpriteSheetRootPath(),
        glyphs: await this._getUrlTemplateForGlyphs(),
      };
    } else {
      return;
    }
  });

  constructor(config: TMSServiceConfig, emsClient: EMSClient, proxyPath: string) {
    super(config, emsClient, proxyPath);
    this._config = config;
  }

  /*
  This method returns an array of objects with the layers and the new
  layout['text-field'] to apply using map.setLayoutProperty
  */
  public static transformLanguageProperty(
    layer: LayerSpecification,
    lang: keyof typeof TMSService.SupportedLanguages
  ): DataDrivenPropertyValueSpecification<FormattedSpecification> | undefined {
    const newLayer = { ...layer };
    const omtLang = this.SupportedLanguages[lang].omtCode;

    if (newLayer.type === 'symbol' && newLayer.layout !== undefined) {
      const textField = newLayer.layout['text-field'];
      if (textField && typeof textField === 'string') {
        return TMSService._getTextField(textField, omtLang);
      }
    }
    return;
  }

  /*
  This method returns an array of objects per layer, containing a list of
  properties with new colors to apply using map.setPaintProperty
  */
  public static transformColorProperties(
    layer: LayerSpecification,
    color: string,
    operation: blendMode,
    percentage: number
  ): { property: keyof layerPaintProperty; color: mbColorDefinition | undefined }[] {
    if (['background', 'fill', 'line', 'symbol'].indexOf(layer.type) !== -1 && layer.paint) {
      const paint = layer.paint as layerPaintProperty;
      const types = Object.keys(paint).filter((key) => {
        return (
          [
            'background-color',
            'circle-color',
            'circle-stroke-color',
            'fill-color',
            'fill-extrusion-color',
            'fill-outline-color',
            'icon-color',
            'icon-halo-color',
            'line-color',
            'text-color',
            'text-halo-color',
          ].indexOf(key) !== -1
        );
      }) as Array<keyof layerPaintProperty>;
      return types.map((type) => {
        const paintColor = paint[type];
        return {
          property: type,
          color: paintColor ? colorizeColor(paintColor, color, operation, percentage) : paintColor,
        };
      });
    } else {
      return [];
    }
  }

  private static _getTextField(
    label: string,
    lang: string
  ): DataDrivenPropertyValueSpecification<string> {
    // Capture {name:xx} labels
    const labelMatch = label.match(/\{name([:_])(.{2})\}/);
    if (labelMatch && labelMatch[1] != lang) {
      // Only apply if the languages are different
      return ['coalesce', ['get', `name:${lang}`], ['get', `name${labelMatch[1]}${labelMatch[2]}`]];
    } else if (label.includes('latin') && label.includes('nonlatin')) {
      // Capture the common pattern {name:latin}\n{name:nonlatin}
      return [
        'coalesce',
        ['get', `name:${lang}`],
        ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
      ];
    }

    // If no case is found, return the input label
    return label;
  }

  async getDefaultRasterStyle(): Promise<EmsRasterStyle | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      const tiles = tileJson.tiles.map(
        (tile: string) => this._proxyPath + this._getAbsoluteUrl(tile)
      );
      return {
        ...tileJson,
        ...{ tiles },
      };
    } else {
      return;
    }
  }

  async getUrlTemplate(): Promise<string> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      const directUrl = this._proxyPath + this._getAbsoluteUrl(tileJson.tiles[0]);
      return this._emsClient.extendUrlWithParams(directUrl);
    } else {
      return '';
    }
  }

  async getUrlTemplateForVector(sourceId: string): Promise<string> {
    const tileJson = await this._getVectorStyleJsonInlined();
    const url = tileJson?.sources[sourceId]?.tiles?.pop();
    if (url) {
      const directUrl = this._proxyPath + this._getAbsoluteUrl(url);
      return this._emsClient.extendUrlWithParams(directUrl);
    } else {
      return '';
    }
  }

  async getVectorStyleSheet(): Promise<EmsVectorStyle | undefined> {
    return await this._getVectorStyleJsonInlined();
  }

  async getVectorStyleSheetRaw(): Promise<EmsVectorStyle | undefined> {
    return await this._getVectorStyleJsonRaw();
  }

  async getSpriteSheetMeta(
    isRetina: boolean = false
  ): Promise<{ png: string; json: EmsSpriteSheet } | undefined> {
    const metaUrl = await this.getSpriteSheetJsonPath(isRetina);
    const spritePngs = await this.getSpriteSheetPngPath(isRetina);
    if (metaUrl && spritePngs) {
      const metaUrlExtended = this._emsClient.extendUrlWithParams(metaUrl);
      const jsonMeta = await this._emsClient.getManifest<EmsSpriteSheet>(metaUrlExtended);
      return {
        png: spritePngs,
        json: jsonMeta,
      };
    } else {
      return;
    }
  }

  async getSpriteSheetJsonPath(isRetina: boolean = false): Promise<string> {
    const spriteSheetRootPath = await this._getSpriteSheetRootPath();
    if (spriteSheetRootPath) {
      const suffix = isRetina ? '@2x' : '';
      return spriteSheetRootPath + suffix + '.json';
    } else {
      return '';
    }
  }

  async getSpriteSheetPngPath(isRetina: boolean = false): Promise<string> {
    const spriteSheetRootPath = await this._getSpriteSheetRootPath();
    if (spriteSheetRootPath) {
      const suffix = isRetina ? '@2x' : '';
      return spriteSheetRootPath + suffix + '.png';
    } else {
      return '';
    }
  }

  getDisplayName(): string {
    return this._emsClient.getValueInLanguage(this._config.name);
  }

  async getMinZoom(): Promise<number | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      return tileJson.minzoom;
    } else {
      return;
    }
  }

  async getMaxZoom(): Promise<number | undefined> {
    const tileJson = await this._getRasterStyleJson();
    if (tileJson) {
      return tileJson.maxzoom;
    } else {
      return;
    }
  }

  getId(): string {
    return this._config.id;
  }

  hasId(id: string): boolean {
    return this._config.id === id;
  }

  getApiUrl(): string {
    return this._emsClient.getTileApiUrl();
  }

  private _getStyleUrlForLocale(formatType: string): string | undefined {
    let vectorFormats = this._getFormats(formatType, this._emsClient.getLocale());
    if (!vectorFormats.length) {
      //fallback to default locale
      vectorFormats = this._getFormats(formatType, this._emsClient.getDefaultLocale());
    }
    if (!vectorFormats.length) {
      // eslint-disable-next-line max-len
      throw new Error(
        `Cannot find ${formatType} tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`
      );
    }
    const defaultStyle = vectorFormats[0];
    if (defaultStyle && defaultStyle.hasOwnProperty('url')) {
      return defaultStyle.url;
    }
  }

  private _getFormats(formatType: string, locale: string): EmsTmsFormat[] {
    return this._config.formats.filter(
      (format) => format.locale === locale && format.format === formatType
    );
  }

  private async _getSpriteSheetRootPath(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson?.sprite) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.sprite);
    } else {
      return '';
    }
  }

  private async _getUrlTemplateForGlyphs(): Promise<string> {
    const vectorStyleJson = await this._getVectorStyleJsonRaw();
    if (vectorStyleJson?.glyphs) {
      return this._proxyPath + this._getAbsoluteUrl(vectorStyleJson.glyphs);
    } else {
      return '';
    }
  }
}
