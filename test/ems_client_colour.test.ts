/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LayerSpecification } from 'maplibre-gl';
import { TMSService } from '../src';
import { mlLayerTypes } from './ems_client_util';
import chroma from 'chroma-js';

function chroma2css(color: chroma.Color): string {
  return `rgba(${color.rgba().join(',')})`;
}

describe('Transform colours', () => {
  it('should return an empty array for non symbol layers without any paint property to update', () => {
    mlLayerTypes
      .filter((l) => l != 'symbol')
      .forEach((type) => {
        const layer = {
          id: 'layer',
          type,
          layout: {},
        } as LayerSpecification;
        expect(TMSService.transformColorProperties(layer, '#FF0000', 'burn', 0)).toMatchObject([]);
      });
  });

  it('should return an empty array for non symbol layer with an empty paint property', () => {
    const layer = {
      id: 'layer',
      type: 'fill',
      paint: {},
    } as LayerSpecification;

    expect(TMSService.transformColorProperties(layer, '#FF0000', 'lighten', 0)).toMatchObject([]);
  });

  it('should return a text-color for symbol layers without a paint property', () => {
    const inColor = chroma('#D36086');
    const textColor = chroma('rgba(0,0,0,1)');
    const inOp = 'lighten';
    const outColor = chroma.blend(textColor, inColor, inOp);

    const transform = TMSService.transformColorProperties;

    const layerWithTextColor = {
      id: 'layer',
      type: 'symbol',
      paint: {
        'text-color': chroma2css(textColor),
      },
    } as LayerSpecification;

    const layerWithoutTextColor = {
      id: 'layer',
      type: 'symbol',
      paint: {},
    } as LayerSpecification;

    const resultWithTextColor = transform(layerWithTextColor, inColor.hex('rgba'), inOp, 0);
    const resultWithoutTextColor = transform(layerWithoutTextColor, inColor.hex('rgba'), inOp, 0);

    expect(resultWithTextColor).toMatchObject(resultWithoutTextColor);
    expect(resultWithoutTextColor[0].color).toBe(chroma2css(outColor));
  });
});
