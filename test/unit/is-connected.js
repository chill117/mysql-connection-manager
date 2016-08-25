'use strict';

var MySQLConnectionManager = require('../..');

var config = require('../config/database');

describe('MySQLConnectionManager#isConnected()', function() {

	describe('after the MySQL connection has been established', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: false
		};

		var manager;

		before(function(done) {

			manager = new MySQLConnectionManager(options);

			manager.once('connect', function() {

				done();
			});
		});

		it('should return TRUE', function(done) {

			if (!manager.isConnected()) {
				return done(new Error('Expected isConnected() to return TRUE'));
			}

			done();
		});
	});

	describe('after the MySQL has disconnected', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			keepAlive: false
		};

		var manager;

		before(function(done) {

			manager = new MySQLConnectionManager(options);

			manager.once('connect', function() {

				done();
			});
		});

		before(function(done) {

			manager.once('disconnect', done);

			manager.connection.destroy();
			manager.connection.emit('error', { code: 'PROTOCOL_CONNECTION_LOST', fatal: true });
		});

		it('should return FALSE', function(done) {

			if (manager.isConnected()) {
				return done(new Error('Expected isConnected() to return FALSE'));
			}

			done();
		});
	});

	describe('after the MySQL connection has been re-established after a disconnect', function() {

		var options = {
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			database: config.database,
			autoReconnect: true,
			reconnectDelay: 25,
			keepAlive: false
		};

		var manager;

		before(function(done) {

			manager = new MySQLConnectionManager(options);

			manager.once('connect', function() {

				done();
			});
		});

		before(function(done) {

			manager.once('reconnect', function() {

				done();
			});

			manager.connection.destroy();
			manager.connection.emit('error', { code: 'PROTOCOL_CONNECTION_LOST', fatal: true });
		});

		it('should return TRUE', function(done) {

			if (!manager.isConnected()) {
				return done(new Error('Expected isConnected() to return TRUE'));
			}

			done();
		});
	});
});
