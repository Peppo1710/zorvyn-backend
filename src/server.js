// Force IPv4-first DNS resolution — fixes ENETUNREACH on VMs without IPv6 (e.g. DigitalOcean)
require('dns').setDefaultResultOrder('ipv4first');

const app = require('./app');
const env = require('./config/env');
require('./jobs/cronJobs');

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
