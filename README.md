# Elastic APM Node.js Agent

This is the official Node.js agent for [Elastic APM](https://www.elastic.co/solutions/apm).

If you have any feedback or questions,
please post them on the [Discuss forum](https://discuss.elastic.co/c/apm).

[![npm](https://img.shields.io/npm/v/elastic-apm-node.svg)](https://www.npmjs.com/package/elastic-apm-node)
[![Build status](https://travis-ci.org/elastic/apm-agent-nodejs.svg?branch=1.x)](https://travis-ci.org/elastic/apm-agent-nodejs)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/standard/standard)

## Installation

```
npm install elastic-apm-node --save
```

## Quick start

1. To run Elastic APM for your own applications,
   make sure you have the prerequisites in place first.
   This agent is compatible with [APM Server](https://github.com/elastic/apm-server) v6.2 and above.
   For details see [Getting Started with Elastic APM](https://www.elastic.co/guide/en/apm/get-started)

1. Now follow the documentation links below relevant to your framework or stack to get set up

## Documentation

- [Table of contents](https://www.elastic.co/guide/en/apm/agent/nodejs)
- [Introduction](https://www.elastic.co/guide/en/apm/agent/nodejs/current/intro.html)
- [Get started with Express](https://www.elastic.co/guide/en/apm/agent/nodejs/current/express.html)
- [Get started with hapi](https://www.elastic.co/guide/en/apm/agent/nodejs/current/hapi.html)
- [Get started with Koa](https://www.elastic.co/guide/en/apm/agent/nodejs/current/koa.html)
- [Get started with Restify](https://www.elastic.co/guide/en/apm/agent/nodejs/current/restify.html)
- [Get started with Lambda](https://www.elastic.co/guide/en/apm/agent/nodejs/current/lambda.html)
- [Get started with a custom Node.js stack](https://www.elastic.co/guide/en/apm/agent/nodejs/current/custom-stack.html)
- [Advanced Setup and Configuration](https://www.elastic.co/guide/en/apm/agent/nodejs/current/advanced-setup.html)
- [API Reference](https://www.elastic.co/guide/en/apm/agent/nodejs/current/api.html)
- [Custom Transactions](https://www.elastic.co/guide/en/apm/agent/nodejs/current/custom-transactions.html)
- [Custom Spans](https://www.elastic.co/guide/en/apm/agent/nodejs/current/custom-spans.html)
- [Performance Tuning](https://www.elastic.co/guide/en/apm/agent/nodejs/current/performance-tuning.html)
- [Source Map Support](https://www.elastic.co/guide/en/apm/agent/nodejs/current/source-maps.html)
- [Compatibility Overview](https://www.elastic.co/guide/en/apm/agent/nodejs/current/compatibility.html)
- [Upgrading](https://www.elastic.co/guide/en/apm/agent/nodejs/current/upgrading.html)
- [Troubleshooting](https://www.elastic.co/guide/en/apm/agent/nodejs/current/troubleshooting.html)

## Contributing

Contributions are welcome,
but we recommend that you take a moment and read our [contribution guide](CONTRIBUTING.md) first.

To ease development,
set the environment variable `DEBUG_PAYLOAD=1` to have the agent dump the JSON payload sent to the APM Server to a temporary file on your local harddrive.

Please see [TESTING.md](TESTING.md) for instructions on how to run the test suite.

## License

[BSD-2-Clause](LICENSE)

<br>Made with ♥️ and ☕️ by Elastic and our community.
