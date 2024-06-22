export interface IBlurrer {
  startBlurring(pattern: RegExp, options: BlurOptions): void;
  stopBlurring(): void;
  blur(pattern: RegExp, options: BlurOptions, target: Element): void;
}

export type BlurOptions = {
  showValue: boolean;
}

export const CLASS_NAME_BLURRED = 'tb-blurred';
export const CLASS_NAME_KEEP = 'tb-keep-this';
export const CLASS_NAME_IGNORE = 'tb-ignore';
