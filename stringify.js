const stringifySorted = (obj) => {
  if (Array.isArray(obj)) return `[${obj.map(stringifySorted).join(',')}]`;
  if (obj !== null && typeof obj === 'object') {
    return `{${Object.keys(obj).sort().map(k => `"${k}":${stringifySorted(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
};
console.log(stringifySorted({b: 2, a: 1}) === stringifySorted({a: 1, b: 2}));
