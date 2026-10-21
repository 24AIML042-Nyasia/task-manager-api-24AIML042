// Entry point — starts the server.
// Kept separate so server.js can be imported by tests without binding a port.
const app = require('./server');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
