// Budget, dep-free deep merge utilities.
// - deepMergeTwo(a,b): safe 2-way deep merge (no input mutation).
// - deepMerge(...objs): left→right merge; always starts from {} so defaults aren’t mutated.

const toStr  = Object.prototype.toString;
const hasOwn = Object.prototype.hasOwnProperty;
const BAD    = new Set(['__proto__', 'constructor', 'prototype']);
const isPlain = (v) => v && toStr.call(v) === '[object Object]';

const forOwn = (obj, fn) => {
  for (const k in obj) {
    if (!hasOwn.call(obj, k)) continue;
    if (BAD.has(k)) continue;
    fn(k, obj[k]);
  }
};

const cloneDeep = (v) => {
  if (Array.isArray(v)) return v.map(cloneDeep);
  if (isPlain(v)) {
    const o = {};
    forOwn(v, (k, val) => { o[k] = cloneDeep(val); });
    return o;
  }
  return v; // primitives & non-plain objects by reference
};

export function deepMergeTwo(a, b) {
  const out = isPlain(a) ? cloneDeep(a) : {};
  if (!isPlain(b)) return out;

  forOwn(b, (k, bv) => {
    const av = out[k];
    if (isPlain(av) && isPlain(bv)) out[k] = deepMergeTwo(av, bv);
    else if (Array.isArray(bv))      out[k] = cloneDeep(bv);      // replace arrays
    else if (isPlain(bv))            out[k] = cloneDeep(bv);      // replace plain objects
    else                             out[k] = bv;                 // primitives / non-plain by ref
  });

  return out;
}

// merge many (left-to-right; later objects override earlier)
// Always seeds with {} so callers’ objects aren’t mutated or shared.
export const deepMerge = (...objs) =>
  objs.reduce((acc, o) => deepMergeTwo(acc, o), {});

export default deepMerge;
