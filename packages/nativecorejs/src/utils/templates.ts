export const html = (strings: TemplateStringsArray, ...values: any[]): string =>
    String.raw({ raw: strings }, ...values);

export const css = (strings: TemplateStringsArray, ...values: any[]): string =>
    String.raw({ raw: strings }, ...values);
