import fs from 'fs-extra';

export default (start, end) =>
  new Promise((resolve, reject) => {
    fs.move(start, end, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
