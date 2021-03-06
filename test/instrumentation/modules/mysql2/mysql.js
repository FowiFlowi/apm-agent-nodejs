'use strict'

var agent = require('../../../..').start({
  serviceName: 'test',
  secretToken: 'test',
  captureExceptions: false
})

var mysql = require('mysql2')
var mysqlPromise = require('mysql2/promise')
var test = require('tape')

var utils = require('./_utils')

var queryable
var queryablePromise
var factories = [
  [createConnection, 'connection', true],
  [createPool, 'pool', true],
  [createPoolAndGetConnection, 'pool > connection', true],
  [createPoolClusterAndGetConnection, 'poolCluster > connection', false],
  [createPoolClusterAndGetConnectionViaOf, 'poolCluster > of > connection', false]
]
var executors = [
  'query',
  'execute'
]

var universalArgumentSets = [
  {
    names: ['sql'],
    query: 'SELECT 1 + 1 AS solution',
    values: (query, cb) => [query, cb]
  },
  {
    names: ['sql', 'values'],
    query: 'SELECT 1 + ? AS solution',
    values: (query, cb) => [query, [1], cb]
  },
  {
    names: ['options'],
    query: 'SELECT 1 + 1 AS solution',
    values: (query, cb) => [{ sql: query }, cb]
  },
  {
    names: ['options', 'values'],
    query: 'SELECT 1 + ? AS solution',
    values: (query, cb) => [{ sql: query }, [1], cb]
  }
]

var callbackArgumentSets = [
  {
    names: ['query'],
    query: 'SELECT 1 + 1 AS solution',
    values: (query, cb) => [mysql.Connection.createQuery(query, [], cb, {})]
  },
  {
    names: ['query_with_values'],
    query: 'SELECT 1 + ? AS solution',
    values: (query, cb) => [mysql.Connection.createQuery(query, [1], cb, {})]
  }
]

factories.forEach(function (f) {
  var factory = f[0]
  var type = f[1]
  var hasPromises = f[2]

  test('mysql2.' + factory.name, function (t) {
    executors.forEach(function (executor) {
      t.test(executor, function (t) {
        var isQuery = executor === 'query'
        var argumentSets = isQuery && type !== 'pool'
          ? universalArgumentSets.concat(callbackArgumentSets)
          : universalArgumentSets

        t.test('callback', function (t) {
          argumentSets.forEach(function (argumentSet) {
            var query = argumentSet.query
            var names = argumentSet.names
            var values = argumentSet.values

            var name = `${type}.${executor}(${names.join(', ')}, callback)`
            var args = values(query, basicQueryCallback(t))

            t.test(name, function (t) {
              resetAgent(function (endpoint, headers, data, cb) {
                assertBasicQuery(t, query, data)
                t.end()
              })
              factory(function () {
                agent.startTransaction('foo')
                queryable[executor].apply(queryable, args)
              })
            })
          })
        })

        if (hasPromises) {
          t.test('promise', function (t) {
            universalArgumentSets.forEach(function (argumentSet) {
              var query = argumentSet.query
              var names = argumentSet.names
              var values = argumentSet.values

              var name = `${type}.${executor}(${names.join(', ')})`
              var args = values(query)

              t.test(name, function (t) {
                resetAgent(function (endpoint, headers, data, cb) {
                  assertBasicQuery(t, query, data)
                  t.end()
                })
                factory(function () {
                  agent.startTransaction('foo')
                  var promise = queryablePromise[executor].apply(queryablePromise, args)
                  basicQueryPromise(t, promise)
                })
              })
            })
          })
        }

        if (isQuery) {
          t.test('streaming', function (t) {
            argumentSets.forEach(function (argumentSet) {
              var query = argumentSet.query
              var names = argumentSet.names
              var values = argumentSet.values

              var name = `${type}.${executor}(${names.join(', ')})`
              var args = values(query)

              t.test(name, function (t) {
                resetAgent(function (endpoint, headers, data, cb) {
                  assertBasicQuery(t, query, data)
                  t.end()
                })
                factory(function () {
                  agent.startTransaction('foo')
                  var stream = queryable[executor].apply(queryable, args)
                  basicQueryStream(stream, t)
                })
              })
            })
          })
        }
      })
    })

    t.test('simultaneous queries', function (t) {
      t.test('on same connection', function (t) {
        resetAgent(function (endpoint, headers, data, cb) {
          t.equal(data.transactions.length, 1)

          var trans = data.transactions[0]

          t.equal(trans.name, 'foo')
          t.equal(trans.spans.length, 3)

          trans.spans.forEach(function (trace) {
            t.equal(trace.name, 'SELECT')
            t.equal(trace.type, 'db.mysql.query')
            t.deepEqual(trace.context.db, { statement: sql, type: 'sql' })
          })

          t.end()
        })

        var sql = 'SELECT 1 + ? AS solution'

        factory(function () {
          var n = 0
          var trans = agent.startTransaction('foo')

          queryable.query(sql, [1], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 2)
            if (++n === 3) done()
          })
          queryable.query(sql, [2], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 3)
            if (++n === 3) done()
          })
          queryable.query(sql, [3], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 4)
            if (++n === 3) done()
          })

          function done () {
            trans.end()
            agent.flush()
          }
        })
      })

      t.test('on different connections', function (t) {
        resetAgent(function (endpoint, headers, data, cb) {
          t.equal(data.transactions.length, 1)

          var trans = data.transactions[0]

          t.equal(trans.name, 'foo')
          t.equal(trans.spans.length, 3)

          trans.spans.forEach(function (trace) {
            t.equal(trace.name, 'SELECT')
            t.equal(trace.type, 'db.mysql.query')
            t.deepEqual(trace.context.db, { statement: sql, type: 'sql' })
          })

          t.end()
        })

        var sql = 'SELECT 1 + ? AS solution'

        createPool(function () {
          var n = 0
          var trans = agent.startTransaction('foo')

          queryable.getConnection(function (err, conn) {
            t.error(err)
            conn.query(sql, [1], function (err, rows, fields) {
              t.error(err)
              t.equal(rows[0].solution, 2)
              if (++n === 3) done()
            })
          })
          queryable.getConnection(function (err, conn) {
            t.error(err)
            conn.query(sql, [2], function (err, rows, fields) {
              t.error(err)
              t.equal(rows[0].solution, 3)
              if (++n === 3) done()
            })
          })
          queryable.getConnection(function (err, conn) {
            t.error(err)
            conn.query(sql, [3], function (err, rows, fields) {
              t.error(err)
              t.equal(rows[0].solution, 4)
              if (++n === 3) done()
            })
          })

          function done () {
            trans.end()
            agent.flush()
          }
        })
      })
    })

    t.test('simultaneous transactions', function (t) {
      resetAgent(function (endpoint, headers, data, cb) {
        t.equal(data.transactions.length, 3)
        var names = data.transactions.map(function (trans) {
          return trans.name
        }).sort()
        t.deepEqual(names, ['bar', 'baz', 'foo'])

        data.transactions.forEach(function (trans) {
          t.equal(trans.spans.length, 1)
          t.equal(trans.spans[0].name, 'SELECT')
          t.equal(trans.spans[0].type, 'db.mysql.query')
          t.deepEqual(trans.spans[0].context.db, { statement: sql, type: 'sql' })
        })

        t.end()
      })

      var sql = 'SELECT 1 + ? AS solution'

      factory(function () {
        var n = 0

        setImmediate(function () {
          var trans = agent.startTransaction('foo')
          queryable.query(sql, [1], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 2)
            trans.end()
            if (++n === 3) done()
          })
        })

        setImmediate(function () {
          var trans = agent.startTransaction('bar')
          queryable.query(sql, [2], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 3)
            trans.end()
            if (++n === 3) done()
          })
        })

        setImmediate(function () {
          var trans = agent.startTransaction('baz')
          queryable.query(sql, [3], function (err, rows, fields) {
            t.error(err)
            t.equal(rows[0].solution, 4)
            trans.end()
            if (++n === 3) done()
          })
        })

        function done () {
          agent.flush()
        }
      })
    })

    // Only pools have a getConnection function
    if (type === 'pool') {
      t.test('connection.release()', function (t) {
        resetAgent(function (endpoint, headers, data, cb) {
          assertBasicQuery(t, sql, data)
          t.end()
        })

        var sql = 'SELECT 1 + 1 AS solution'

        factory(function () {
          agent.startTransaction('foo')

          queryable.getConnection(function (err, conn) {
            t.error(err)
            conn.release()

            queryable.getConnection(function (err, conn) {
              t.error(err)
              conn.query(sql, basicQueryCallback(t))
            })
          })
        })
      })
    }
  })
})

function basicQueryPromise (t, p) {
  function done () {
    agent.endTransaction()
    agent.flush()
  }

  p.then(function (response) {
    var rows = response[0]
    t.equal(rows[0].solution, 2)
    done()
  }, function (error) {
    t.error(error)
    done()
  })
}

function basicQueryCallback (t) {
  return function (err, rows, fields) {
    t.error(err)
    t.equal(rows[0].solution, 2)
    agent.endTransaction()
    agent.flush()
  }
}

function basicQueryStream (stream, t) {
  var results = 0
  stream.on('error', function (err) {
    t.error(err)
  })
  stream.on('result', function (row) {
    results++
    t.equal(row.solution, 2)
  })
  stream.on('end', function () {
    t.equal(results, 1)
    agent.endTransaction()
    agent.flush()
  })
}

function assertBasicQuery (t, sql, data) {
  t.equal(data.transactions.length, 1)

  var trans = data.transactions[0]

  t.equal(data.transactions[0].name, 'foo')
  t.equal(trans.spans.length, 1)
  var span = trans.spans[0]
  t.equal(span.name, 'SELECT')
  t.equal(span.type, 'db.mysql.query')
  t.deepEqual(span.context.db, { statement: sql, type: 'sql' })
}

function createConnection (cb) {
  setup(function () {
    teardown = function teardown () {
      if (queryable) {
        queryable.end()
        queryable = undefined
      }
      if (queryablePromise) {
        queryablePromise.end()
        queryablePromise = undefined
      }
    }

    queryable = mysql.createConnection(utils.credentials())
    queryable.connect()

    mysqlPromise.createConnection(utils.credentials()).then(connection => {
      queryablePromise = connection
      cb()
    })
  })
}

function createPool (cb) {
  setup(function () {
    teardown = function teardown () {
      if (queryable) {
        queryable.end()
        queryable = undefined
      }
      if (queryablePromise) {
        queryablePromise.end()
        queryablePromise = undefined
      }
    }

    queryable = mysql.createPool(utils.credentials())
    queryablePromise = mysqlPromise.createPool(utils.credentials())

    cb()
  })
}

function createPoolAndGetConnection (cb) {
  setup(function () {
    teardown = function teardown () {
      if (pool) {
        pool.end()
        pool = undefined
        queryable = undefined
      }
      if (poolPromise) {
        poolPromise.end()
        poolPromise = undefined
        queryablePromise = undefined
      }
    }

    var pool = mysql.createPool(utils.credentials())
    var poolPromise = mysqlPromise.createPool(utils.credentials())

    pool.getConnection(function (err, conn) {
      if (err) throw err
      queryable = conn

      poolPromise.getConnection().then(function (conn) {
        queryablePromise = conn
        cb()
      })
    })
  })
}

function createPoolClusterAndGetConnection (cb) {
  setup(function () {
    teardown = function teardown () {
      if (cluster) {
        cluster.end()
        cluster = undefined
        queryable = undefined
      }
    }

    var cluster = mysql.createPoolCluster()
    cluster.add(utils.credentials())
    cluster.getConnection(function (err, conn) {
      if (err) throw err
      queryable = conn
      cb()
    })
  })
}

function createPoolClusterAndGetConnectionViaOf (cb) {
  setup(function () {
    teardown = function teardown () {
      cluster.end()
    }

    var cluster = mysql.createPoolCluster()
    cluster.add(utils.credentials())
    cluster.of('*').getConnection(function (err, conn) {
      if (err) throw err
      queryable = conn
      cb()
    })
  })
}

function setup (cb) {
  teardown() // just in case it didn't happen at the end of the previous test
  utils.reset(cb)
}

// placeholder variable to hold the teardown function created by the setup function
var teardown = function () {}

function resetAgent (cb) {
  agent._httpClient = { request () {
    teardown()
    cb.apply(this, arguments)
  } }
  agent._instrumentation._queue._clear()
  agent._instrumentation.currentTransaction = null
}
