'use strict'

const shimmer = require('../shimmer')

module.exports = function (expressQueue, agent, version, enabled) {
  if (!enabled) return expressQueue

  const ins = agent._instrumentation

  return function wrappedExpressQueue (config) {
    const result = expressQueue(config)
    shimmer.wrap(result.queue, 'createJob', function (original) {
      return function (job) {
        if (job.next) {
          job.next = ins.bindFunction(job.next)
        }
        return original.apply(this, arguments)
      }
    })
    return result
  }
}
