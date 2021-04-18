// import * as pkg from 'https://cdn.skypack.dev/lodash-es@^4.17.15';
// export const _ = pkg.lodash

import "https://deno.land/x/lodash@4.17.19/dist/lodash.js";
// now `_` is imported in the global variable, which in deno is `self`
export const _ = (self as any)._;
