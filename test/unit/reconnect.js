var MySQLConnectionManager = require('../..')

var config = require('../config/database')

describe('MySQLConnectionManager#', function() {

	describe('option: \'autoReconnect\'', function() {

		describe('is set to FALSE', function() {

			describe('and the MySQL connection has been lost', function() {

				var options = {
					host: config.host,
					port: config.port,
					user: config.user,
					password: config.password,
					database: config.database,
					autoReconnect: false,
					reconnectDelay: [ 10, 25, 50 ],
					useConnectionPooling: false,
					reconnectDelayGroupSize: 3,
					maxReconnectAttempts: 11
				}

				var manager

				before(function(done) {

					manager = new MySQLConnectionManager(options)

					manager.once('connect', function() {

						done()

					})

				})

				after(function() {

					if (manager.connection.state != 'disconnected')
						manager.connection.destroy()

				})

				it('should not attempt to reconnect', function(done) {

					var timeout

					// Override the reconnect method.
					manager.reconnect = function() {

						clearTimeout(timeout)
						done(new Error('Expected no reconnection attempts.'))

					}

					timeout = setTimeout(done, 50)

					manager.connection.destroy()
					manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

				})

			})

		})

		describe('is set to TRUE', function() {

			describe('and the MySQL connection has NOT been lost', function() {

				var options = {
					host: config.host,
					port: config.port,
					user: config.user,
					password: config.password,
					database: config.database,
					autoReconnect: true,
					reconnectDelay: [ 10, 25, 50 ],
					useConnectionPooling: false,
					reconnectDelayGroupSize: 3,
					maxReconnectAttempts: 11
				}

				var manager

				before(function(done) {

					manager = new MySQLConnectionManager(options)

					manager.once('connect', function() {

						done()

					})

				})

				after(function() {

					if (manager.connection.state != 'disconnected')
						manager.connection.destroy()

				})

				it('should not attempt to reconnect', function(done) {

					var timeout

					// Override the reconnect method.
					manager.reconnect = function() {

						clearTimeout(timeout)
						done(new Error('Expected no reconnection attempts.'))

					}

					timeout = setTimeout(done, 50)

				})

			})

			describe('and the MySQL connection has been lost', function() {

				var options = {
					host: config.host,
					port: config.port,
					user: config.user,
					password: config.password,
					database: config.database,
					autoReconnect: true,
					reconnectDelay: [ 15, 25 ],
					useConnectionPooling: false,
					reconnectDelayGroupSize: 3,
					maxReconnectAttempts: 7
				}

				var manager

				before(function(done) {

					manager = new MySQLConnectionManager(options)

					manager.once('connect', function() {

						done()

					})

				})

				after(function() {

					if (manager.connection.state != 'disconnected')
						manager.connection.destroy()

				})

				it('should attempt to reconnect', function(done) {

					var timeout, called = false

					// Override the reconnect method.
					manager.reconnect = function() {

						clearTimeout(timeout)

						if (!called)
						{
							called = true
							done()
						}

					}

					timeout = setTimeout(function() {

						done(new Error('Expected at least one reconnection attempt.'))

					}, 80)

					manager.connection.destroy()
					manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

				})

			})

		})

		describe('options: \'reconnectDelay\', \'reconnectDelayGroupSize\'', function() {

			var options = {
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				autoReconnect: true,
				reconnectDelay: [ 23, 44 ],
				useConnectionPooling: false,
				reconnectDelayGroupSize: 3,
				maxReconnectAttempts: 7
			}

			var manager

			before(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.once('connect', function() {

					done()

				})

			})

			after(function() {

				if (manager.connection.state != 'disconnected')
					manager.connection.destroy()

			})

			it('should wait for the correct amount of time before each reconnection attempt', function(done) {

				var numAttempts = 0, testTime = 0, expectedTestTime = getExpectedTestTime()

				var originalReconnect = manager.reconnect

				// Override the internal reconnect method.
				manager.reconnect = function() {

					numAttempts++

					originalReconnect.call(manager)

				}

				// Override the connect method, to prevent the connection from being re-established.
				manager.connect = function(cb) {

					cb('Some error..')

				}

				var intervalCheck = 0, intervalTime = expectedTestTime / 2

				setTimeout(checkNumAttempts, intervalTime)

				function checkNumAttempts() {

					intervalCheck++

					var elapsedTime = intervalTime * intervalCheck
					var numAttemptsExpected = getExpectedNumberOfAttempts(elapsedTime)

					if (numAttempts != numAttemptsExpected)
						return done(new Error('Expected exactly ' + numAttemptsExpected + ' reconnection attempts.'))

					if (elapsedTime >= expectedTestTime)
						return done()

					setTimeout(checkNumAttempts, intervalTime)

				}

				function getExpectedNumberOfAttempts(elapsedTime) {

					var expectedTestTime = 0, expectedNumberOfAttempts = 0

					for (var n = 1; n < options.maxReconnectAttempts; n++)
					{
						expectedTestTime += getExpectedDelay(n)

						if (elapsedTime - expectedTestTime < 10)
							break

						expectedNumberOfAttempts++
					}

					return expectedNumberOfAttempts

				}

				function getExpectedDelay(attemptNumber) {

					var numGroups = options.reconnectDelay.length
					var groupIndex = Math.floor(attemptNumber / options.reconnectDelayGroupSize)

					return options.reconnectDelay[groupIndex] || options.reconnectDelay[numGroups - 1]

				}

				function getExpectedTestTime() {

					var expectedTestTime = 0

					for (var n = 1; n <= options.maxReconnectAttempts; n++)
						expectedTestTime += getExpectedDelay(n)

					return expectedTestTime

				}

				manager.connection.destroy()
				manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

			})

		})

	})

	describe('After a reconnect', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			autoReconnect: true,
			reconnectDelay: [ 10, 25 ],
			useConnectionPooling: false,
			reconnectDelayGroupSize: 3,
			maxReconnectAttempts: 15
		}

		var manager, connection

		beforeEach(function(done) {

			manager = new MySQLConnectionManager(options)

			connection = manager.connection

			manager.once('connect', function() {

				done()

			})

		})

		beforeEach(function(done) {

			manager.once('reconnect', function() {

				done()

			})

			manager.connection.destroy()
			manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

		})

		afterEach(function() {

			if (manager.connection.state != 'disconnected')
				manager.connection.destroy()

		})

		it('should be able to run a query on the connection object', function(done) {

			connection.query('SHOW TABLES', function(error) {

				if (error)
					return done(error)

				done()

			})

		})

	})

})