import promisify from 'promisify-node';
import ini from 'ini';

import { RC_FILE } from './defaults';
import getHome from './getHome';

const fs = promisify(require('fs'));

export const getConfig = () =>
  fs.readFile(`${getHome()}/${RC_FILE}`, 'utf-8')
  .then(file => ini.parse(file));

export const setConfig = config =>
  fs.writeFile(`${getHome}/${RC_FILE}`, 'utf-8', ini.encode(config));
