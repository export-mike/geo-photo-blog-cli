import gm from 'gm';
import chalk from 'chalk';
import concat from 'unique-concat';
import glob from './glob';
import {
  COMPRESSION_QUALITY,
  COMPRESSED_KEY,
  COMPRESSION_CONCURRENCY,
} from './defaults';

import { cacheGet, cacheSet } from './cache';
import leftOuterJoin from './leftOuterJoin';

const compressJpg = ({ config, verbose, log }) => jpg =>
  new Promise((resolve, reject) => {
    verbose('compressing', jpg);
    gm.subClass({ imageMagick: true })(jpg)
    .quality(config.quality || COMPRESSION_QUALITY)
    .write(jpg, err => {
      if (err) {
        log(`${jpg} failed to write, ${err}`);
        reject({ path: jpg, message: `${jpg} failed to write` });
      } else {
        setTimeout(() => resolve(jpg), 300);
      }
    });
  });

const takeTop = (n, queue) => queue.splice(0, 5);

const compress = ({ queue, config, filtered, compressed, log, verbose }) => {
  const concurrency = config.jpgconcurrency || COMPRESSION_CONCURRENCY;
  const top = takeTop(concurrency, queue);
  log('top', top);
  const promise = Promise.all(top.map(compressJpg({ config, log, verbose })));
  log('compression queue length', queue.length);
  if (queue.length) {
    return promise
    .then(() => compress({ queue, config, filtered, compressed, log, verbose }));
  }
  return promise.then(() => ({ compressed, filtered }));
};

export default ({ config, log, verbose }) => () =>
  Promise.all([
    glob('**/*.JPG'),
    cacheGet(COMPRESSED_KEY, { parse: true, noFail: true }),
  ])
  .then(([jpgs, compressed = []]) => {
    const filtered = leftOuterJoin(jpgs, compressed);
    // verbose('compressed images', compressed);§
    if (!filtered.length) {
      log(chalk.red.bold('No images to resize'));
      return Promise.resolve();
    }

    return compress({ compressed, filtered, queue: [...filtered], config, log, verbose })
    .then(() => {
      log('compressed', compressed);
      log('filtered', filtered);
      if (compressed && compressed.length) {
        return cacheSet(COMPRESSED_KEY, concat(compressed, filtered));
      }
      return cacheSet(COMPRESSED_KEY, filtered);
    });
  });
