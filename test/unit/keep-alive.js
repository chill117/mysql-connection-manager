var chai = require('chai')
var expect = chai.expect
var MySQLConnectionManager = require('../..')

var config = require('../config/database')

describe('MySQLConnectionManager#', function() {

	describe('options: keepAliveInterval', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: true,
			keepAliveInterval: 18
		}

		var manager

		before(function(done) {

			manager = new MySQLConnectionManager(options)

			manager.once('connect', function() {

				done()

			})

		})

		after(function() {

			manager.connection.destroy()

		})

		it('should correctly set the keep-alive interval time', function(done) {

			var numCalls = 0, intervalTime = options.keepAliveInterval

			// Override the keepAlive method.
			manager.keepAlive = function() {

				numCalls++

			}

			var testTime = (intervalTime * 5) + 10

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
			keepAliveInterval: 36
		}

		var manager

		before(function(done) {

			manager = new MySQLConnectionManager(options)

			manager.once('connect', function() {

				done()

			})

		})

		after(function() {

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

})