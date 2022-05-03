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
    const inColor = chroma('teal').alpha(0.5);
    const outColor = chroma.blend(chroma('black'), inColor, 'lighten');

    const layer = {
      id: 'layer',
      type: 'symbol',
      paint: {},
    } as LayerSpecification;

    expect(
      TMSService.transformColorProperties(layer, inColor.hex('rgba'), 'lighten', 0)
    ).toMatchObject([
      {
        property: 'text-color',
        color: `rgba(${outColor.rgba().join(',')})`,
      },
    ]);
  });
});
