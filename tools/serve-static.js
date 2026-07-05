const express = require('express');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 5500);
const host = '127.0.0.1';

const app = express();
app.use(express.static(root));
app.get('*', (req, res) => {
  res.sendFile(path.join(root, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});
