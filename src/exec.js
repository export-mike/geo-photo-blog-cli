import { exec } from 'child_process';

export default cmd =>
  new Promise((resolve, reject) =>
    exec(cmd, { maxBuffer: 1024 * 1000 },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error, stderr);
        }
        return resolve(stdout);
      })
  );
