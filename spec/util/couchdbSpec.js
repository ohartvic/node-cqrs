var http = require('http'),
    nano = require('nano'),
    jasmine = require('jasmine-node'),
    CouchDb = require('../../lib/util/couchdb'),
    EventEmitter = require('events').EventEmitter;

describe('couchdb', function() {
  var couchdb;

  beforeEach(function() {
    couchdb = new CouchDb({database: 'cqrs'});
  })

  describe('constructor', function() {
    it('should create nano instance with given attributes', function() {
      expect(couchdb._db.config.url).toEqual('http://localhost:5984');
      expect(couchdb._db.config.db).toEqual('cqrs');
    })
  })

  describe('createDocument', function() {
    it('should call proper request', function() {
      var callback = function() {},
          data = JSON.stringify({ foo: 'bar' });

      spyOn(couchdb._db, 'insert');
      
      couchdb.createDocument('1234', data, callback);

      expect(couchdb._db.insert).toHaveBeenCalledWith(data, '1234', callback);
    })
  })

  describe('deleteDocument', function() {
    it('should call proper request', function() {
      var callback = function() {};

      spyOn(couchdb._db, 'destroy');
      
      couchdb.deleteDocument(1234, 12345, callback);

      expect(couchdb._db.destroy).toHaveBeenCalledWith(1234, 12345, callback);
    })
  })

  describe('request', function() {
    var req, res;

    beforeEach(function() {
      req = Object.create({
        end: function() {},
        write: function() {}
      });

      res = new EventEmitter();

      var s = spyOn(http, 'request').andReturn(req);     
      s.andCallFake(function(params, callback) {
        callback(res);
        return req;
      })
    })

    it('should call http.request with auth header if auth params are given', function() {
      var got;
      couchdb.user = 'foo';
      couchdb.password = 'bar';

      http.request.andCallFake(function(options, callback) {
        got = options.headers;

        return req;
      })

      couchdb.request();

      expect(http.request).toHaveBeenCalled();
      expect(got['Authorization']).toEqual("Basic " + new Buffer('foo:bar').toString('base64'))
    })

    it('should call http.request with valid params', function() {
      couchdb.request();

      expect(http.request).toHaveBeenCalledWith({
        host: 'localhost', 
        port: 5984, 
        method: 'GET', path : '/' 
      }, jasmine.any(Function));
    })

    it('should setup proper default options', function() {
      couchdb.options = {};

      couchdb.request();

      expect(http.request).toHaveBeenCalledWith({
        host: 'localhost', 
        port: 5984, 
        method: 'GET',
        path: '/' 
      }, jasmine.any(Function));
    })

    it('should call post', function() {
      couchdb.options = {};

      couchdb.request({method: 'POST'});

      expect(http.request).toHaveBeenCalledWith({
        host: 'localhost', 
        port: 5984, 
        method: 'POST', 
        path: '/' }, jasmine.any(Function));
    })    

    it('should call proper url', function() {
      couchdb.options = {};

      couchdb.request({path: '/foo'});

      expect(http.request).toHaveBeenCalledWith({
        host: 'localhost', 
        port: 5984, 
        method: 'GET', 
        path: '/foo' }, jasmine.any(Function));
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

      it('dont require callback to be specified', function() {
        couchdb.request({});

        res.emit('end', 'foo');
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