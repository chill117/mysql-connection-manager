var chai = require('chai')
var expect = chai.expect
var MySQLConnectionManager = require('../..')

var config = require('../config/database')

describe('MySQLConnectionManager#', function() {

	describe('option: \'keepAlive\'', function() {

		describe('is set to FALSE', function() {

			var options = {
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				keepAlive: false,
				keepAliveInterval: 15
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

			it('should not send keep-alive signals', function(done) {

				var numCalls = 0

				// Override the keepAlive method.
				manager.keepAlive = function() {

					numCalls++

				}

				setTimeout(function() {

					expect(numCalls).to.equal(0)
					done()

				}, 55)

			})

		})

		describe('when set to TRUE', function() {

			var options = {
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				keepAlive: true,
				keepAliveInterval: 15
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

			it('should send keep-alive signals', function(done) {

				var timeout, called = false

				// Override the keepAlive method.
				manager.keepAlive = function() {

					clearTimeout(timeout)

					if (!called)
					{
						called = true
						done()
					}

				}

				timeout = setTimeout(function() {

					done(new Error('Expected at least one keep-alive signal to have been sent.'))

				}, 60)

			})
			
		})

	})

	describe('option: \'keepAliveInterval\'', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: true,
			keepAliveInterval: 26
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

		it('should correctly set the keep-alive interval time', function(done) {

			var numCalls = 0, intervalTime = options.keepAliveInterval

			// Override the keepAlive method.
			manager.keepAlive = function() {

				numCalls++

			}

			var testTime = (intervalTime * 5) + 30

			setTimeout(function() {

				var numCallsExpected = Math.floor(testTime / intervalTime)

				expect(numCalls).to.equal(numCallsExpected)

				done()

			}, testTime)

		})

	})

	describe('setKeepAliveInterval(interval)', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: true,
			keepAliveInterval: 40
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

		it('should correctly set the keep-alive interval time', function(done) {

			var numCalls = 0, intervalTime = 24

			// Override the keepAlive method.
			manager.keepAlive = function() {

				numCalls++

			}

			manager.setKeepAliveInterval(intervalTime)

			var testTime = (intervalTime * 5) + 10

			setTimeout(function() {

				var numCallsExpected = Math.floor(testTime / intervalTime)

				expect(numCalls).to.equal(numCallsExpected)

				done()

			}, testTime)

		})

	})

	describe('keepAlive()', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: true,
			keepAliveInterval: 30000
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

		it('should be able to send a keep-alive signal', function(done) {

			try {

				manager.keepAlive()

			} catch (error) {

				if (error)
					return done(new Error(error))

			}

			done()

		})

	})

	describe('keep-alive', function() {

		describe('While the database connection is disconnected', function() {

			var options = {
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				autoReconnect: true,
				reconnectDelay: [ 5000 ],
				useConnectionPooling: false,
				reconnectDelayGroupSize: 3,
				maxReconnectAttempts: 5,
				keepAlive: true,
				keepAliveInterval: 15
			}

			var manager

			before(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.once('connect', function() {

					done()

				})

			})

			before(function(done) {

				manager.once('disconnect', function() {

					done()

				})

				manager.connection.destroy()
				manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

			})

			after(function() {

				if (manager.connection.state != 'disconnected')
					manager.connection.destroy()

			})

			it('should not send keep-alive signals', function(done) {

				var numCalls = 0

				// Override the keepAlive method.
				manager.keepAlive = function() {

					numCalls++

				}

				setTimeout(function() {

					expect(numCalls).to.equal(0)
					done()

				}, 55)
				
			})

		})

		describe('After the database connection has been re-established', function() {

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
				maxReconnectAttempts: 5,
				keepAlive: true,
				keepAliveInterval: 15
			}

			var manager

			before(function(done) {

				manager = new MySQLConnectionManager(options)

				manager.once('connect', function() {

					done()

				})

			})

			before(function(done) {

				manager.once('reconnect', function() {

					done()

				})

				manager.connection.destroy()
				manager.connection.emit('error', {code: 'PROTOCOL_CONNECTION_LOST'})

			})

			after(function() {

				if (manager.connection.state != 'disconnected')
					manager.connection.destroy()

			})

			it('should send keep-alive signals', function(done) {

				var timeout, called = false

				// Override the keepAlive method.
				manager.keepAlive = function() {

					clearTimeout(timeout)

					if (!called)
					{
						called = true
						done()
					}

				}

				timeout = setTimeout(function() {

					done(new Error('Expected at least one keep-alive signal to have been sent.'))

				}, 60)

			})

		})

	})

})