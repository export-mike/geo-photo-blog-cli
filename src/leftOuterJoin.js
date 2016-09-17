//
export default function leftOuterJoin(left, right) {
  const outer = [];
  const rightMap = {};
  // index the right table first
  right.forEach(v => {
    rightMap[v] = v; // eslint-disable-line no-param-reassign
  });
  left.forEach(l => {
    const found = rightMap[l];
    if (!found) {
      outer.push(l);
    }
  });
  return outer;
}
