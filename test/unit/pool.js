var MySQLConnectionManager = require('../..')

var config = require('../config/database')

describe('MySQLConnectionManager#', function() {

	describe('option: \'useConnectionPooling\'', function() {

		describe('when set to TRUE', function() {

			var options = {
				host: config.host,
				port: config.port,
				user: config.user,
				password: config.password,
				database: config.database,
				useConnectionPooling: true,
				keepAlive: true,
				keepAliveInterval: 2000
			}

			var manager

			before(function() {

				manager = new MySQLConnectionManager(options)

			})

			it('should be able to query a connection from the connection pool', function(done) {

				manager.connection.getConnection(function(error, connection) {

					if (error)
						return done(new Error('An unexpected error occurred'))

					if (!connection || !connection.query)
						return done(new Error('Expected a valid connection object'))

					connection.query('SHOW TABLES', function(error, result) {

						if (error)
							return done(new Error('Failed to query the connection'))

						done()

					})

				})

			})

		})

	})

})