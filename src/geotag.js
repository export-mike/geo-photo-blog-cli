#! /usr/bin/env node
import program from 'commander';
import chalk from 'chalk';
// import { execFile, exec } from 'child_process';
import debug from 'debug';
import inirc from 'inirc';
import prompt from 'prompt';
import pkg from '../package.json';
import glob from './glob';
import exec from './exec';
import move from './move';

prompt.start();
const RC_FILE = '.geotagrc';
const TAGGED_FOLDER = '.tagged';

const rc = inirc(RC_FILE);
debug.enable('geotag');
const log = debug('geotag');
const verbose = debug('geotag:verbose');
const cwd = process.cwd();

program
  .description('geotag pictures, sync output to s3, publish to photoblog, shells out to exiftool')
  .version(pkg.version)
  .option('--verbose', 'verbose mode for debugging')
  .option('--publish', 'upload to s3 and post images metadata to blog')
  .option('--s3', 'upload to s3')
  .option('--configure', 'configure cli')
  .option('-j, --rawtojpeg', 'convert raw files to JPEGs')
  .parse(process.argv);

if (program.verbose) debug.enable('geotag:*');

function tagImages() {
  return new Promise((resolve, reject) => {
    execFile('exiftool',
      ['-geotag', program.geotag, program.path],
      (error, stdout, stderr) => {
        if (error) {
          log(chalk.red(error));
          log(chalk.red(stderr));
          return reject(error, stderr);
        }
        log(`\n${chalk.green(stdout)}`);
        return resolve(stdout);
      }
    );
  });
}




const syncToS3 = config => () => {
  if (program.s3 || program.publish) {
    return new Promise((resolve, reject) => {
      /* eslint-disable max-len */
      const cmd = `s3cmd sync --exclude '*.NEF' --exclude '*.gpx' --exclude '*.JPG_original' ${program.path} ${config.s3bucket}`;
      verbose(cmd);
      exec(cmd,
        (error, stdout, stderr) => {
          if (error) {
            log(chalk.red(error));
            log(chalk.red(stderr));
            return reject(error, stderr);
          }
          log(`\n${chalk.green(stdout)}`);
          return resolve(stdout);
        }
      );
    });
  }
  return Promise.resolve();
};

const rawToJpeg = () =>
  new Promise((resolve, reject) => {
    const cmd = `exiftool -b -JpgFromRaw -w _JFR.JPG -ext NEF -r ${program.path}`;
    verbose(cmd);
    exec(cmd,
      (err, stdout, stderr) => {
        if (err) {
          log(chalk.red(err));
          log(chalk.red(stderr));
          return reject(err, stderr);
        }
        log(stderr);
        log(`\n${chalk.green(stdout)}`);
        return resolve(stdout);
      });
  });

function publishToBlog() {
  if (program.publish) {
    return Promise.resolve();
  }
  return Promise.resolve();
}

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

const geoTag = ([pictures, video, gpxFiles]) => {
  const gpx = gpxFiles.map(g => `-geotag "${g}"`).toString().replace(/,/g, ' ');
  const mediaFiles = [...pictures, ...video];
  const media = mediaFiles.map(m => `"${m}"`).toString().replace(/,/g, ' ');
  const cmd = `exiftool ${gpx} ${media}`;
  return exec(cmd)
  .then((stdout) => {
    log(chalk.green(stdout));
    return mediaFiles;
  });
};

const moveToTagged = mediaFiles =>
  Promise.all(mediaFiles.map(m => move(m, `${TAGGED_FOLDER}/${m}`)));

// const sync = config => s3Sy
if (program.configure) {
  log(chalk.green.bold(`Please configure your s3 Bucket in ${RC_FILE}`));
  prompt.get(['s3bucket'], (prompterr, result) => {
    if (prompterr) {
      verbose(chalk.red.bold(prompterr));
      log(chalk.red.bold('An error occured when reading your input'));
      process.exit(1);
    }

    return rc.put({ s3bucket: `s3://${result.s3bucket}` }, err => {
      if (err) {
        verbose(chalk.red.bold(err));
        log(chalk.red.bold(`An error occured when writing to ~/${RC_FILE},
          please check your file permissions for geotag and ~/`));
        return process.exit(1);
      }
      return process.exit(0);
    });
  });
} else {
  getConfig()
  .then((config) => {
    verbose('Config', config);
    // if (program.rawtojpeg) {
    //   log('running rawtojpeg');
    //   rawToJpeg();
    // }

    return Promise.all([glob('**/*.JPG'), glob('**/*.MOV'), glob('**/*.gpx')])
    .then(geoTag)
    .then(moveToTagged);
    // .then(sync);
  })
      // .then(tagImages)
      // .then(syncToS3(config))
      // .then(publishToBlog);
  .catch((err) => {
    log(chalk.red.bold(err));
    process.exit(1);
  });
}
