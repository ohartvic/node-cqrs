var http = require('http'),
    jasmine = require('jasmine-node'),
    CouchDb = require('../lib/couchdb'),
    EventEmitter = require('events').EventEmitter;

describe('couchdb', function() {
  var couchdb;

  beforeEach(function() {
    couchdb = new CouchDb('cqrs');
  })

  describe('constructor', function() {

    it('should store database name', function() {
      expect(couchdb.database).toEqual('cqrs');
    })

    it('host should be default to localhost', function() {
      expect(couchdb.options.host).toEqual('localhost');
    })

    it('port should be default to localhost', function() {
      expect(couchdb.options.port).toEqual(5984);
    })    
  })

  describe('createDocument', function() {
    it('should call proper request', function() {
      var callback = function() {},
          data = JSON.stringify({ foo: 'bar' }),
          options = { path: '/cqrs/1234', method: 'PUT', data: data },
          couchdbGetUuid = couchdb.getUuid;

      couchdb.getUuid = function(callback) { callback('1234'); }
      spyOn(couchdb, 'request');
      
      couchdb.createDocument(data, callback);

      expect(couchdb.request).toHaveBeenCalledWith(options, callback);

      couchdb.getUuid = couchdbGetUuid;
    })
  })

  describe('getUuid', function() {
    it('should call proper request', function() {
      var options = {
        path: '/_uuids', 
        method: 'GET', 
      };
      spyOn(couchdb, 'request');

      couchdb.getUuid(function() {});

      expect(couchdb.request).toHaveBeenCalledWith(options, jasmine.any(Function));
    })

    it('it should parse value and call callback', function() {
      var foo = { callback: function() {} },
          couchdbRequest = couchdb.request;

      couchdb.request = function(options, callback) {
        callback('{"uuids":["a45287db79779654689b4df73a00087a"]}');
      }
      spyOn(foo, 'callback');

      couchdb.getUuid(foo.callback);

      expect(foo.callback).toHaveBeenCalledWith('a45287db79779654689b4df73a00087a');
    })
  })

  describe('request', function() {
    var req;

    beforeEach(function() {
      req = Object.create({
        end: function() {},
        write: function() {}
      });

      spyOn(http, 'request').andReturn(req);
    })

    it('should call http.request with valid params', function() {
      couchdb.request();

      expect(http.request).toHaveBeenCalledWith(couchdb.options, jasmine.any(Function));
    })

    it('should setup proper default options', function() {
      couchdb.options = {};

      couchdb.request();

      expect(http.request).toHaveBeenCalledWith({method: 'GET', path: '/'}, jasmine.any(Function));
    })

    it('should call post', function() {
      couchdb.options = {};

      couchdb.request({method: 'POST'});

      expect(http.request).toHaveBeenCalledWith({method: 'POST', path: '/'}, jasmine.any(Function));
    })    

    it('should call proper url', function() {
      couchdb.options = {};

      couchdb.request({path: '/foo'});

      expect(http.request).toHaveBeenCalledWith({method: 'GET', path: '/foo'}, jasmine.any(Function));
    }) 

    it('should end request', function() {
      spyOn(req, 'end');

      couchdb.request();

      expect(req.end).toHaveBeenCalled();
    });

    it('should write data to request if specified', function() {
      spyOn(req, 'write');

      couchdb.request({data: 'foo'});

      expect(req.write).toHaveBeenCalledWith('foo');
    });  
    
    describe('response', function() {
      var res, httpRequest;

      beforeEach(function() {
        res = new EventEmitter();

        httpRequest = http.request;

        http.request = function(params, callback) {
          callback(res);
          return req;
        };
      })

      afterEach(function() {
        http.request = httpRequest;
      })

      it('should register handler for data event', function() {
        spyOn(res, 'on');

        couchdb.request();

        expect(res.on).toHaveBeenCalledWith('data', jasmine.any(Function));
        expect(res.on).toHaveBeenCalledWith('end', jasmine.any(Function));
      })

      it('should call callback if response ends', function() {
        var foo = { callback: function() {} };
        spyOn(foo, 'callback');
        couchdb.request({}, foo.callback);

        res.emit('end', 'foo');

        expect(foo.callback).toHaveBeenCalledWith('foo');
      })

      it('should call store data into buffer', function() {
        var foo = { callback: function() {} };
        spyOn(foo, 'callback');
        couchdb.request({}, foo.callback);

        res.emit('data', 'foo');
        res.emit('end', undefined);

        expect(foo.callback).toHaveBeenCalledWith('foo');
      })

    });  
  });
});