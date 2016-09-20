import inirc from 'inirc';
import { RC_FILE } from './defaults';

const rc = inirc(RC_FILE);

export default function getConfig() {
  return new Promise((resolve, reject) =>
    rc.get((err, data) => {
      if (err) return reject(err);
      return resolve(data);
    })
  );
}
