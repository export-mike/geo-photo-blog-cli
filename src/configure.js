import prompt from 'prompt';
import chalk from 'chalk';
import { RC_FILE } from './defaults';
import * as iniConfig from './config';

const setConfig = loggers => config =>
  new Promise((resolve, reject) => {
    prompt.get(['s3bucket', 's3key', 's3secret'], (prompterr, result) => {
      if (prompterr) {
        loggers.verbose(chalk.red.bold(prompterr));
        loggers.log(chalk.red.bold('An error occured when reading your input'));
        resolve();
      }
      return iniConfig.setConfig({
        ...config,
        s3bucket: result.s3bucket,
        s3key: result.s3key,
        s3secret: result.s3secret,
      }, err => {
        if (err) {
          const msg = `An error occured when writing to ~/${RC_FILE},
            please check your file permissions for geotag and ~/`;
          loggers.verbose(chalk.red.bold(err));
          loggers.log(chalk.red.bold(msg));
          return reject(msg);
        }
        return resolve();
      });
    });
  });

export default (loggers) =>
  iniConfig.getConfig()
  .then(setConfig(loggers))
  .catch(setConfig(loggers));
