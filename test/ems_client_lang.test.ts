/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerSpecification } from 'maplibre-gl';
import { TMSService } from '../src';
import { mlLayerTypes } from './ems_client_util';

describe('Support for languages', () => {
  it('should return undefined for non symbol layers', () => {
    mlLayerTypes
      .filter((l) => l !== 'symbol')
      .forEach((type) => {
        const layer = {
          id: 'aLayer',
          type,
        } as LayerSpecification;

        expect(TMSService.transformLanguageProperty(layer, 'en')).toBeUndefined();
      });
  });

  it('should return undefined for non layers without a layout', () => {
    const layer = {
      id: 'aLayer',
      type: 'symbol',
    } as LayerSpecification;

    expect(TMSService.transformLanguageProperty(layer, 'en')).toBeUndefined();
  });

  it('should handle inexistent languages', () => {
    const enDashLayer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{name_en}',
      },
    } as LayerSpecification;
    const invalidLang = 'I_DONT_EXIST';
    const invalidLangError = `${invalidLang} is not a supported language`;

    expect(() => {
      TMSService.transformLanguageProperty(enDashLayer, invalidLang);
    }).toThrow(invalidLangError);
  });

  it('should handle {name_XX} and {name:XX} definitions', () => {
    const enDashLayer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{name_en}',
      },
    } as LayerSpecification;

    const transformLangEn = TMSService.transformLanguageProperty(enDashLayer, 'en');

    expect(transformLangEn).toEqual(['coalesce', ['get', 'name:en'], ['get', 'name_en']]);
    const enColonLayer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{name:en}',
      },
    } as LayerSpecification;

    const transformLangJa = TMSService.transformLanguageProperty(enColonLayer, 'ja-jp');

    expect(transformLangJa).toEqual(['coalesce', ['get', 'name:ja'], ['get', 'name:en']]);
  });

  it('should handle {name:latin}\\n{name:nonlatin} definitions', () => {
    const layer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{name:latin}\n{name:nonlatin}',
      },
    } as LayerSpecification;

    const transform = TMSService.transformLanguageProperty(layer, 'ja-jp');

    expect(transform).toMatchObject([
      'coalesce',
      ['get', 'name:ja'],
      ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
    ]);
  });

  it('should handle {name:latin} {name:nonlatin} definitions', () => {
    const layer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{name:latin} {name:nonlatin}',
      },
    } as LayerSpecification;

    const transform = TMSService.transformLanguageProperty(layer, 'ja-jp');

    expect(transform).toMatchObject([
      'coalesce',
      ['get', 'name:ja'],
      ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
    ]);
  });

  it('should handle text field properties that are not translated', () => {
    const layer = {
      id: 'sampLayer',
      type: 'symbol',
      layout: {
        'text-field': '{ref}',
      },
    } as LayerSpecification;

    const transform = TMSService.transformLanguageProperty(layer, 'ja-jp');

    expect(transform).toBe('{ref}');
  });
});
