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

type EmsVectorStyle = StyleSpecification & {
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
  List of supported languages with labels and OMT codes extracted
  from https://openmaptiles.org/languages

  Keys are values for i18.locale from Kibana settings
  and OMT codes for the rest. 
  */
  public static SupportedLanguages = [
    { key: 'ar', omt: 'ar' },
    { key: 'az', omt: 'az' },
    { key: 'be', omt: 'be' },
    { key: 'bg', omt: 'bg' },
    { key: 'br', omt: 'br' },
    { key: 'bs', omt: 'bs' },
    { key: 'ca', omt: 'ca' },
    { key: 'cs', omt: 'cs' },
    { key: 'cy', omt: 'cy' },
    { key: 'da', omt: 'da' },
    { key: 'de', omt: 'de' },
    { key: 'el', omt: 'el' },
    { key: 'en', omt: 'en' },
    { key: 'eo', omt: 'eo' },
    { key: 'es', omt: 'es' },
    { key: 'et', omt: 'et' },
    { key: 'fi', omt: 'fi' },
    { key: 'fr-fr', omt: 'fr' },
    { key: 'fy', omt: 'fy' },
    { key: 'ga', omt: 'ga' },
    { key: 'gd', omt: 'gd' },
    { key: 'he', omt: 'he' },
    { key: 'hi-in', omt: 'hi' },
    { key: 'hr', omt: 'hr' },
    { key: 'hu', omt: 'hu' },
    { key: 'hy', omt: 'hy' },
    { key: 'is', omt: 'is' },
    { key: 'it', omt: 'it' },
    { key: 'ja_kana', omt: 'ja_kana' },
    { key: 'ja_rm', omt: 'ja_rm' },
    { key: 'ja-jp', omt: 'ja' },
    { key: 'ka', omt: 'ka' },
    { key: 'kk', omt: 'kk' },
    { key: 'kn', omt: 'kn' },
    { key: 'ko_rm', omt: 'ko_rm' },
    { key: 'ko', omt: 'ko' },
    { key: 'la', omt: 'la' },
    { key: 'lb', omt: 'lb' },
    { key: 'lt', omt: 'lt' },
    { key: 'lv', omt: 'lv' },
    { key: 'mk', omt: 'mk' },
    { key: 'mt', omt: 'mt' },
    { key: 'nl', omt: 'nl' },
    { key: 'no', omt: 'no' },
    { key: 'pl', omt: 'pl' },
    { key: 'pt-pt', omt: 'pt' },
    { key: 'rm', omt: 'rm' },
    { key: 'ro', omt: 'ro' },
    { key: 'ru-ru', omt: 'ru' },
    { key: 'sk', omt: 'sk' },
    { key: 'sl', omt: 'sl' },
    { key: 'sq', omt: 'sq' },
    { key: 'sr-Ltn', omt: 'sr-Ltn' },
    { key: 'sr', omt: 'sr' },
    { key: 'sv', omt: 'sv' },
    { key: 'th', omt: 'th' },
    { key: 'tr', omt: 'tr' },
    { key: 'uk', omt: 'uk' },
    { key: 'zh-cn', omt: 'zh' },
  ];

  /*
  Suggested default operations for the different EMS styles
  */
  public static colorOperationDefaults: {
    style: string;
    operation: blendMode;
    percentage: number;
  }[] = [
      { style: 'road_map', operation: 'mix', percentage: 0.25 },
      { style: 'road_map_desaturated', operation: 'screen', percentage: 0.25 },
      { style: 'dark_map', operation: 'dodge', percentage: 0.25 },
    ];

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
    lang: string
  ): DataDrivenPropertyValueSpecification<FormattedSpecification> | undefined {
    const supportedLang = this.SupportedLanguages.find((l) => l.key === lang);
    if (layer.type === 'symbol' && layer.layout !== undefined && supportedLang !== undefined) {
      const omtLang = supportedLang.omt;
      const textField = layer.layout['text-field'];
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
    color?: string,
    operation?: blendMode,
    percentage?: number
  ): { property: keyof layerPaintProperty; color: mbColorDefinition | undefined }[] {
    if (['background', 'fill', 'line', 'symbol'].indexOf(layer.type) !== -1 && layer.paint) {
      const paint = layer.paint as layerPaintProperty;
      if (layer.type === 'symbol' && Object.keys(paint).length === 0) {
        paint['text-color'] = 'rgb(0,0,0)';
      }
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
          color:
            paintColor && color
              ? colorizeColor(paintColor, color, operation, percentage)
              : paintColor,
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

  async getMinZoom(format = 'vector'): Promise<number | undefined> {
    switch (format) {
      case 'vector': {
        const { sources } = (await this._getVectorStyleJsonInlined()) || { sources: {} };
        return Math.min(
          ...Object.values(sources)
            .map((s) => {
              return s && s instanceof Object && 'minzoom' in s ?
                s['minzoom'] :
                null
            })
            .filter((minzoom): minzoom is number => Number.isFinite(minzoom))
        );
      }
      case 'raster': {
        const { minzoom } = (await this._getRasterStyleJson()) || {};
        return minzoom;
      }
      default:
        return;
    }
  }

  async getMaxZoom(format = 'vector'): Promise<number | undefined> {
    switch (format) {
      case 'vector': {
        const { sources } = (await this._getVectorStyleJsonInlined()) || { sources: {} };
        return Math.max(
          ...Object.values(sources)
            .map((s) => {
              return s && s instanceof Object && 'maxzoom' in s ?
                s['maxzoom'] :
                null
            })
            .filter((maxzoom): maxzoom is number => Number.isFinite(maxzoom))
        );
      }
      case 'raster': {
        const { maxzoom } = (await this._getRasterStyleJson()) || {};
        return maxzoom;
      }
      default:
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
      throw new Error(
        `Cannot find ${formatType} tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`
      );
    }
    const defaultStyle = vectorFormats[0];
    if (defaultStyle && Object.prototype.hasOwnProperty.call(defaultStyle, 'url')) {
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
