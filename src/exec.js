import { exec } from 'child_process';

export default cmd =>
  new Promise((resolve, reject) =>
    exec(cmd,
      (error, stdout, stderr) => {
        if (error) {
          return reject(error, stderr);
        }
        return resolve(stdout);
      })
  );
