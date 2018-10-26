'use strict'

const shimmer = require('../shimmer')

const searchRegexp = /_search$/

module.exports = function (elasticsearch, agent, version, enabled) {
  if (!enabled) return elasticsearch

  agent.logger.debug('shimming elasticsearch.Transport.prototype.request')
  shimmer.wrap(elasticsearch.Transport && elasticsearch.Transport.prototype, 'request', wrapRequest)

  return elasticsearch

  function wrapRequest (original) {
    return function wrappedRequest (params, cb) {
      const span = agent.buildSpan()
      const id = span && span.transaction.id
      const method = params && params.method
      const path = params && params.path
      const query = params && params.query

      agent.logger.debug('intercepted call to elasticsearch.Transport.prototype.request %o', { id: id, method: method, path: path })

      if (span && method && path) {
        span.start('Elasticsearch: ' + method + ' ' + path, 'db.elasticsearch.request')

        if (query && searchRegexp.test(path)) {
          span.setDbContext({
            type: 'elasticsearch',
            statement: JSON.stringify(query)
          })
        }

        if (typeof cb === 'function') {
          const args = Array.prototype.slice.call(arguments)
          args[1] = function () {
            span.end()
            return cb.apply(this, arguments)
          }
          return original.apply(this, args)
        } else {
          const p = original.apply(this, arguments)
          p.then(function () {
            span.end()
          })
          return p
        }
      } else {
        agent.logger.debug('could not instrument elasticsearch request %o', { id: id })
        return original.apply(this, arguments)
      }
    }
  }
}
