import * as React from 'react';

export type ComponentProps<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> =
  React.ComponentProps<T>;