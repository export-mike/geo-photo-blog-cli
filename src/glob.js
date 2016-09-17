import g from 'glob';

export default function glob(expr, opts) {
  return new Promise((resolve, reject) =>
    g(expr, opts, (err, files) => {
      if (err) return reject(err);
      return resolve(files);
    })
  );
}

export function globWithIgnore(expr) {
  return glob(expr, {
    ignore: ['.synced', '.synced/**', '.tagged/**', '.tagged'],
  });
}
