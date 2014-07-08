var chai = require('chai')
var expect = chai.expect
var MySQLConnectionManager = require('../..')

var config = require('../config/database')

describe('MySQLConnectionManager#reconnect', function() {

	describe('When auto reconnect is disabled', function() {

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

			beforeEach(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.on('connect', function(connection) {

					done()

				})

			})

			afterEach(function() {

				manager.connection.destroy()

			})

			it('should not attempt to reconnect', function(done) {

				var numAttempts = 0

				// Override the reconnect method.
				manager.reconnect = function() {

					numAttempts++

				}

				setTimeout(function() {

					expect(numAttempts).to.equal(0)
					done()

				}, 45)

				manager.connection.destroy()
				manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

			})

		})

	})

	describe('When auto reconnect is enabled', function() {

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

			beforeEach(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.on('connect', function(connection) {

					done()

				})

			})

			afterEach(function() {

				manager.connection.destroy()

			})

			it('should not attempt to reconnect', function(done) {

				var numAttempts = 0

				// Override the reconnect method.
				manager.reconnect = function() {

					numAttempts++

				}

				setTimeout(function() {

					expect(numAttempts).to.equal(0)
					done()

				}, 45)

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
				reconnectDelay: [ 15, 35, 55 ],
				useConnectionPooling: false,
				reconnectDelayGroupSize: 3,
				maxReconnectAttempts: 11
			}

			var manager

			beforeEach(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.on('connect', function(connection) {

					done()

				})

			})

			it('should wait for the correct amount of time before each reconnection attempt', function(done) {

				var numAttempts = 0, testTime = 0, expectedTestTime = getExpectedTestTime()

				var originalReconnect = manager.reconnect

				// Override the reconnect method.
				manager.reconnect = function() {

					numAttempts++

					originalReconnect.call(manager)

				}

				// Override the connect method, to prevent the connection from being re-established.
				manager.connect = function(cb) {

					cb('Some error..')

				}

				setTimeout(function() {

					var numAttemptsExpected = options.maxReconnectAttempts

					expect(numAttempts).to.equal(numAttemptsExpected)

					done()

				}, expectedTestTime)

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

})