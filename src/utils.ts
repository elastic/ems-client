/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  PropertyValueSpecification,
} from 'maplibre-gl';

/**
 * Resolves a target URL path relative to the host.
 * This is specifically useed by the Kibana proxy re-routing.
 * It also handles trailing slashes in tileApiUrl and fileApiUrl parameters.
 */
export function toAbsoluteUrl(host: string | undefined, path: string): string {
  if (!host) {
    return path;
  }
  const hostEndWithSlash = host[host.length - 1] === '/';
  const pathStartsWithSlash = path[0] === '/';

  if (hostEndWithSlash === true && pathStartsWithSlash === true) {
    return host + path.slice(1);
  } else if (hostEndWithSlash !== pathStartsWithSlash) {
    return host + path;
  } else {
    return host + '/' + path;
  }
}

/*
Type with the possible ways to define a color in maplibre
*/
export type mbColorDefinition =
  | PropertyValueSpecification<ColorSpecification>
  | DataDrivenPropertyValueSpecification<ColorSpecification>;

/*
A selection of the different maplibre-gl-js properties that refer to a color.
Taken from maplibre https://github.com/maplibre/maplibre-gl-js/blob/main/src/style-spec/types.g.ts
*/
export type layerPaintProperty = {
  'background-color'?: PropertyValueSpecification<ColorSpecification>;
  'circle-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'circle-stroke-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'fill-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'fill-extrusion-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'fill-outline-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'icon-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'icon-halo-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'line-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'text-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  'text-halo-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
};

/*
Function to transform a maplibre color definition by a given function.
*/
function transformColor(paintColor: mbColorDefinition, func: Function): mbColorDefinition {
  if (typeof paintColor == 'string') {
    const modifiedColor = func(paintColor);
    return `rgba(${modifiedColor.rgba().join(',')})`;
  } else if (
    typeof paintColor == 'object' &&
    'stops' in paintColor &&
    Array.isArray(paintColor?.stops)
  ) {
    const stops = paintColor['stops'].map((stop) => {
      const newColor = transformColor(stop[1], func);
      return [stop[0], newColor];
    });
    const newPaintColor = Object.assign({}, paintColor, { stops: stops });
    return newPaintColor;
  } else return paintColor;
}

/*
This is the function used to generate the current EMS desaturated roadmap
*/
export function desaturateColor(paintColor: mbColorDefinition): mbColorDefinition {
  return transformColor(paintColor, (color: string) => {
    return chroma(color).desaturate(1.1).brighten(0.33);
  });
}

/*
Blends an originar maplibre color definition with a destination
color, using the 'screen' method from the chroma-js library.

More details: https://gka.github.io/chroma.js/#chroma-blend
*/
export function colorizeColor(
  sourceColor: mbColorDefinition,
  destColor: string
): mbColorDefinition {
  return transformColor(sourceColor, (color: string) => {
    return chroma.blend(chroma(color), destColor, 'screen');
  });
}
