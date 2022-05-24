/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FillLayerSpecification, LayerSpecification } from 'maplibre-gl';
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
        expect(TMSService.transformColorProperties(layer, '#FF0000', 'burn', 0)).toEqual([]);
      });
  });

  it('should return an empty array for non symbol layer with an empty paint property', () => {
    const layer = {
      id: 'layer',
      type: 'fill',
      paint: {},
    } as LayerSpecification;

    expect(TMSService.transformColorProperties(layer, '#FF0000', 'lighten', 0)).toEqual([]);
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

    expect(resultWithTextColor).toEqual([
      {
        color: chroma2css(outColor),
        property: 'text-color',
      },
    ]);
    expect(resultWithoutTextColor).toEqual([
      {
        color: chroma2css(outColor),
        property: 'text-color',
      },
    ]);
  });

  it('should work with color expressions with stops', () => {
    const inColor = chroma('#D36086');
    const fillColors = [chroma('rgba(0,0,0,1)'), chroma('rgba(255,0,0,1)')];
    const inOp = 'lighten';

    const outColors = fillColors.map((fillColor) => {
      return chroma.blend(fillColor, inColor, inOp);
    });

    const transform = TMSService.transformColorProperties;

    const layerWithTextColor = {
      id: 'layer',
      type: 'fill',
      source: '',
      paint: {
        'fill-color': {
          base: 1,
          stops: fillColors.map((fillColor) => {
            return [1, chroma2css(fillColor)];
          }),
        } as unknown,
      },
    } as FillLayerSpecification;

    const { color } = transform(layerWithTextColor, inColor.hex('rgba'), inOp, 0)[0];

    expect(color).toEqual({
      base: 1,
      stops: outColors.map((fillColor) => {
        return [1, chroma2css(fillColor)];
      }),
    });
  });

  it('should return the same colors if no input color is specified', () => {
    const fillColors = ['#ff0000', '#00ff00', '#0000ff'];

    const transform = TMSService.transformColorProperties;

    const fillColorPaint = {
      base: 1,
      stops: fillColors.map((fillColor) => {
        return [1, fillColor];
      }),
    };

    const layerWithFillColor = {
      id: 'layer',
      type: 'fill',
      paint: {
        'fill-color': fillColorPaint,
      } as unknown,
    } as FillLayerSpecification;

    const { color, property } = transform(layerWithFillColor)[0];

    expect(property).toEqual('fill-color');
    expect(color).toEqual(fillColorPaint);
  });
});
