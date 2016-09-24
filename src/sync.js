import level from 'level';
import s3sync from 's3-sync';
import readdirp from 'readdirp';
import path from 'path';
import chalk from 'chalk';

// To cache the S3 HEAD results and speed up the
// upload process. Usage is optional.
export default ({ config, log, program }) => () => {
  const cwd = process.cwd();
  const db = level(path.resolve(cwd, '.cache'));
  /* eslint-disable consistent-return */
  if (!program.sync) return Promise.resolve(); // option to avoid s3 sync

  const files = readdirp({
    root: cwd,
    fileFilter: ['*.JPG', program.ignoreVideo ? undefined : '*.MOV'].filter(i => !!i),
  });
  // Takes the same options arguments as `knox`,
  // plus some additional options listed above
  return new Promise((resolve, reject) => {
    const uploader = s3sync(db, {
      key: config.s3key,
      secret: config.s3secret,
      bucket: config.s3bucket,
      concurrency: config.s3concurrency || 16,
    }).on('data', (file) => {
      log(`${file.fullPath} -> ${file.url}`);
    })
    .once('end', (err) => {
      if (err) {
        reject(err);
      }
      uploader.putCache((error) => {
        if (error) throw error;
        log(chalk.green.bold('upload complete!'));
        db.close();
        resolve();
      });
    });
    files.pipe(uploader);
  });
};
