import superagent from 'superagent';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import parseDMS from 'parse-dms';

import exec from './exec';
import glob from './glob';

function formatToDMS(s) {
  const su = s.replace(/\s/g, '')
  .replace('deg', '°')
  .replace('"', '\'');
  return `${su.substr(0, su.length - 1)} ${su.substr(su.length - 1)}`;
}

function toDms(d) {
  return formatToDMS(d);
}

/* eslint-disable consistent-return */
export default ({ config, log, program }) => () => {
  if (!program.exposeExport) return Promise.resolve();

  return Promise.all([
    glob('**/*.JPG'),
    glob('**/*.MOV'),
    glob('**/*.NEF'),
  ])
  .then(([
    jpgs = [],
    movs = [],
    nefs = [],
  ]) => {
    const media = [...jpgs, ...movs, ...nefs];
    if (!config.apiPath && !config.apiToken) {
      log(chalk.red.bold('Missing apiPath and apiToken in ~/.geotagrc skipping request to api'));
    } else {
      log(chalk.green('Sending to ${config.apiPath}', {
        media,
      }));

      superagent
      .post(config.apiPath)
      .send(media)
      .set('X-API-TOKEN', config.apiToken)
      .end((err, res) => {
        if (err) return log(chalk.red.bold('Error sending to API', err));
        log(chalk.blue('API response', res));
        // cacheSet(GPX_FILES_KEY, concat(filtered, gpxFilesCache));
      });
    }

    if (config.expose) {
      return exec(
        `exiftool ${media
          .toString()
          .replace(/,/g, ' ')} -json`
      )
      .then(j => JSON.parse(j))
      .then(imgs => imgs.map(img => {
        const { lat, lon } = parseDMS(`${toDms(img.GPSLatitude)} ${toDms(img.GPSLongitude)}`);
        log('DMS', `${toDms(img.GPSLatitude)} ${toDms(img.GPSLongitude)}`);
        log('lat, lon', lat, lon);
        return {
          name: img.SourceFile
            .toLowerCase()
            .replace(/_/g, '')
            .replace(/-/g, '')
            .replace(/\.jpg/g, '')
            .replace(/\.jpeg/g, '')
            .replace(/\.png/g, '')
            .replace(/\.gif/g, '')
            .replace(/\.mov/g, ''),
          lat,
          lon,
        };
      }))
      .then(imgs =>
        new Promise((resolve, reject) => {
          try {
            fs.writeFileSync(
              path.join(config.expose, '_site/exifinfo.json'),
              JSON.stringify(imgs)
            );
            return resolve();
          } catch (e) {
            return reject(e);
          }
        })
      )
      .then(() => {
        log(chalk.green.bold('Written to ', path.join(config.expose, '_site/exifinfo.json')));
      });
    }
    return Promise.resolve();
  });
};
