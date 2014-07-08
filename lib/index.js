var debug_log = require('debug')('mysql-connection-manager:log')
var debug_error = require('debug')('mysql-connection-manager:error')
var EventEmitter = require('events').EventEmitter
var mysql = require('mysql')

var defaultOptions = {
	autoReconnect: true,// Whether or not to re-establish a database connection after a disconnect.
	reconnectDelay: [
		500,// Time between each attempt in the first group of reconnection attempts; milliseconds.
		1000,// Time between each attempt in the second group of reconnection attempts; milliseconds.
		5000,// Time between each attempt in the third group of reconnection attempts; milliseconds.
		30000,// Time between each attempt in the fourth group of reconnection attempts; milliseconds.
		300000// Time between each attempt in the fifth group of reconnection attempts; milliseconds.
	],
	useConnectionPooling: false,// Whether or not to use connection pooling.
	reconnectDelayGroupSize: 5,// Number of reconnection attempts per reconnect delay value.
	maxReconnectAttempts: 25,// Maximum number of reconnection attempts. Set to 0 for unlimited.
	keepAlive: true,// Whether or not to send keep-alive pings on the database connection(s).
	keepAliveInterval: 30000,// How frequently keep-alive pings will be sent; milliseconds.
}

var MySQLConnectionManager = function(options, connection) {

	this.options = options || {}
	this.connection = connection || null

	this.initialize()

}

// Extend the MySQLConnectionManager prototype with the EventEmitter's prototype.
for (var key in EventEmitter.prototype)
	MySQLConnectionManager.prototype[key] = EventEmitter.prototype[key]

MySQLConnectionManager.prototype.initialize = function() {

	this.setDefaultOptions()

	if (!this.connection)
	{
		var self = this

		this.connect(function(error, connection) {

			if (error)
			{
				debug_error('Failed to establish database connection..')
				debug_error(error)
				return
			}

			debug_log('Connection established..')

			self.emit('connect', connection)

		})
	}

	if (
		!this.options.useConnectionPooling &&
		this.options.autoReconnect
	)
		this.listenForDisconnect()
	else
		this.connection.on('error', function() {})

	if (this.options.keepAlive)
		this.setKeepAliveInterval()

}

MySQLConnectionManager.prototype.connect = function(cb) {

	if (this.options.useConnectionPooling)
		this.createPool(cb)
	else
		this.createConnection(cb)

}

MySQLConnectionManager.prototype.createConnection = function(cb) {

	debug_log('Creating new database connection..')

	var connection = this.connection = mysql.createConnection(this.options)

	connection.connect(function(error) {

		if (error)
			return cb(error)

		cb(null, connection)

	})

}

MySQLConnectionManager.prototype.createPool = function(cb) {

	debug_log('Creating new database connection pool..')

	var connection = this.connection = mysql.createPool(this.options)

	connection.on('error', cb)

	connection.on('connection', function() {

		cb(null, connection)

	})

}

MySQLConnectionManager.prototype.reconnect = function() {

	if (this.hasExceededMaxNumberOfReconnectAttempts())
	{
		// No more attempts..
		debug_log('Maximum number of reconnect attempts has been reached..')
		return
	}

	var delay = this.getReconnectDelay()

	setTimeout(this._reconnect.call(this), delay)

}

MySQLConnectionManager.prototype._reconnect = function() {

	debug_log('Attempting to re-establish connection..')

	this._failedReconnectAttempts++

	var self = this

	this.connect(function(error, connection) {

		if (error)
		{
			debug_error('Failed to re-establish connection..')
			debug_error(error.code)
			self.reconnect()
			return
		}

		debug_log('Connection has been re-established..')

		if (
			!self.options.useConnectionPooling &&
			self.options.autoReconnect
		)
			self.listenForDisconnect()

		if (self.options.keepAlive)
			self.setKeepAliveInterval()

		self.emit('reconnect', connection)

	})

}

MySQLConnectionManager.prototype.hasExceededMaxNumberOfReconnectAttempts = function() {

	return 	this.options.maxReconnectAttempts &&
			this._failedReconnectAttempts >= this.options.maxReconnectAttempts - 1

}

MySQLConnectionManager.prototype.getReconnectDelay = function() {

	if (!(this.options.reconnectDelay instanceof Array))
		return this.options.reconnectDelay

	var num_groups = this.options.reconnectDelay.length
	var group_size = this.options.reconnectDelayGroupSize
	var attempt_number = this._failedReconnectAttempts
	var group_index = Math.floor(attempt_number / group_size)

	return this.options.reconnectDelay[group_index] || this.options.reconnectDelay[num_groups - 1]

}

MySQLConnectionManager.prototype.listenForDisconnect = function() {

	var self = this

	this.connection.on('error', function(error) {

		if (error.code == 'PROTOCOL_CONNECTION_LOST')
		{
			debug_log('Connection to database has been lost..')

			self.emit('disconnect')

			self._failedReconnectAttempts = 0

			// Stop sending keep-alive signals.
			self.clearKeepAliveInterval()

			self.reconnect()
		}

	})

}

MySQLConnectionManager.prototype.setDefaultOptions = function() {

	for (var name in defaultOptions)
		if (typeof this.options[name] == 'undefined')
			this.options[name] = defaultOptions[name]

}

MySQLConnectionManager.prototype.keepAlive = function() {

	debug_log('Sending keep-alive signal..')

	if (!this.options.useConnectionPooling)
		return this.connection.ping()

	this.connection.getConnection(function(error, connection) {

		if (error)
		{
			debug_error('Failed to send keep-alive signal because an unexpected error has occurred.')
			debug_error(error.code)
			return
		}

		connection.ping()
		connection.release()

	})

}

MySQLConnectionManager.prototype.setKeepAliveInterval = function(interval) {

	this.clearKeepAliveInterval()

	var self = this

	this._keepAliveInterval = setInterval(function() {

		self.keepAlive()

	}, interval || this.options.keepAliveInterval)

}

MySQLConnectionManager.prototype.clearKeepAliveInterval = function() {

	clearInterval(this._keepAliveInterval)

}

module.exports = MySQLConnectionManager