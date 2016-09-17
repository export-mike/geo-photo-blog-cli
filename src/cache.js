import level from 'level';
import { CACHE } from './defaults';

const db = level(CACHE);

export const cacheSet = (k, v) =>
  new Promise((resolve, reject) => {
    const value = typeof (v) === 'object' ? JSON.stringify(v) : v;
    db.put(k, value, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

export const cacheGet = (k, opts) =>
  new Promise((resolve, reject) => {
    const { noFail, parse } = { noFail: false, parse: false, ...opts };
    db.get(k, (err, d) => {
      if ((noFail && err) || !d) return resolve();
      if (err) return reject(err);
      return resolve(parse ? JSON.parse(d) : d);
    });
  });

export const cacheDel = (k, opts) =>
  new Promise((resolve, reject) => {
    const { noFail } = { noFail: false, ...opts };
    db.del(k, (err) => {
      if (noFail && err) return resolve();
      if (err) return reject(err);
      return resolve();
    });
  });
