#! /usr/bin/env node
import program from 'commander';
import chalk from 'chalk';
import debug from 'debug';
import inirc from 'inirc';
import prompt from 'prompt';
import fs from 'fs';
import path from 'path';
import concat from 'unique-concat';
import sound from 'play-sound';
import notify from 'osx-notifier';
import pkg from '../package.json';
import { globWithIgnore as glob } from './glob';
import exec from './exec';
import s3config from './s3config';
import sync from './sync';
import getHome from './getHome';
import compress from './compress';
import leftOuterJoin from './leftOuterJoin';
import { cacheSet, cacheGet, cacheDel } from './cache';
import getIGotUGpxFile from './getIGotUGpxFile';
import { RC_FILE, TAGGED_KEY } from './defaults';


/* eslint-disable max-len */
prompt.start();

const rc = inirc(RC_FILE);
debug.enable('geotag');
const log = debug('geotag');
const verbose = debug('geotag:verbose');

program
  .description('geotag pictures, sync output to s3, publish to photoblog, shells out to exiftool')
  .version(pkg.version)
  .option('--verbose', 'verbose mode for debugging')
  .option('--configure', 'configure cli')
  .option('--nosync', 'process files but don\'t sync with s3')
  .option('--cache', 'cache options')
  .option('--clear <key>', 'to be used in conjunction with cache', String)
  .option('--ignoreVideo', 'flag to ignore MOV files for faster uploading on poor wifi', String)
  .option('--skipGPXImport', 'flag to skip gpx import from igotugpx', String)
  .option('--gpxImport <path>', 'optional path for output. Only import data from igotugpx then exit', String)
  .parse(process.argv);

if (program.verbose) debug.enable('geotag:*');

function getConfig() {
  return new Promise((resolve, reject) =>
    rc.get((err, data) => {
      if (err) return reject(err);
      if (!data.s3bucket) {
        log(chalk.red.bold('please configure first with --configure'));
        reject(err);
        process.exit(1);
      }
      return resolve(data);
    })
  );
}

const geoTag = () =>
  Promise.all([
    glob('**/*.gpx'),
    cacheGet(TAGGED_KEY, { noFail: true, parse: true }),
    glob('**/*.JPG'),
    glob('**/*.NEF'),
    program.ignoreVideo ? Promise.resolve([]) : glob('**/*.MOV'),
  ])
  .then(([gpxFiles, tagged = [], jpgs, nefs, movs]) => {
    // find new files to tag
    const newMedia = [...jpgs, ...nefs, ...movs];
    const filtered = leftOuterJoin(newMedia, tagged);
    if (!filtered.length) {
      log(chalk.red.bold('No new files found for Tagging'));
      return Promise.resolve(); // continue through chain
    }
    // strip whitespace for exiftool to work
    const gpx = gpxFiles.map(g => `-geotag "${g}"`).toString().replace(/,/g, ' ');
    const media = filtered.map(m => `"${m}"`).toString().replace(/,/g, ' ');
    // -overwrite_original
    const cmd = `exiftool -overwrite_original ${gpx} ${media}`;

    log(chalk.green('Geo-Tagging images using gpx files'));
    return exec(cmd)
    .then((stdout) => {
      log(chalk.green(stdout));
      // ensure our tagged table is unique
      return cacheSet(TAGGED_KEY, concat(tagged, filtered));
    });
  });

const rcFileCheck = () =>
  fs.accessSync(
    path.resolve(getHome(), RC_FILE),
    fs.R_OK | fs.W_OK,
    err => {
      if (err) {
        log(chalk.red.bold('Please configure before first use with --configure'));
        process.exit(1);
      }
    });

rcFileCheck();
if (program.configure) {
  s3config({
    log,
    verbose,
  }, rc)
  .then(() => process.exit(0))
  .catch((err) => {
    log(chalk.red.bold(err));
    process.exit(1);
  });
} else if (program.cache && program.clear) {
  cacheDel(program.clear)
  .then(() => log(chalk.green.bold(`Cleared ${program.clear}`)))
  .catch(e => {
    log(chalk.red.bold(e));
    log(chalk.red.bold(e.stack));
  });
} else if (program.gpxImport) {
  getConfig()
  .then((config) =>
    getIGotUGpxFile({ config, log, verbose, program })
    .then(() => log(chalk.green.bold('GPX data imported. exiting...')))
  )
  .catch((err) => {
    log(chalk.red.bold(err));
    log(chalk.red.bold(err.stack));
    process.exit(1);
  });
} else {
  getConfig()
  .then((config) => {
    verbose('Config', config);
    // if (program.rawtojpeg) {
    //   log('running rawtojpeg');
    //   rawToJpeg();
    // }
    // generate gpx file
    // return Promise.all([glob('**/*.JPG'), glob('**/*.MOV'), glob('**/*.gpx')])
    // .then(filterProcessedFiles)
    let promise = Promise.resolve();
    if (config.gpstracker === 'igotu' && !program.skipGPXImport) {
      promise = getIGotUGpxFile({ config, log, verbose, program });
    }
    promise
    .then(() => geoTag({ config, log, verbose, program }))
    .then(compress({ config, log, verbose, program }))
    .then(sync({ config, log, verbose, program }))
    .then(() => {
      log(chalk.green.bold('All files have been processed'));
      sound({}).play('/System/Library/Sounds/Glass.aiff', (e) => { if (e) log(chalk.red.bold(e)); });
      notify({
        type: 'pass',
        title: 'Geo Tag',
        subtitle: 'Task completed',
        message: 'All files have been processed',
        group: 'geotag',
      });
    });
  })
  .catch((err) => {
    log(chalk.red.bold(err));
    log(chalk.red.bold(err.stack));
    process.exit(1);
  });
}
