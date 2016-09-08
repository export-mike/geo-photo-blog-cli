import glob from 'glob';

export default expr =>
  new Promise((resolve, reject) =>
    glob(expr, {
      ignore: ['synced', 'synced/**'],
    }, (err, files) => {
      if (err) return reject(err);
      return resolve(files);
    })
  );
