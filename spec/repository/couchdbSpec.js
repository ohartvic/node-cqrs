var http = require('http'),
    jasmine = require('jasmine-node'),
    CouchDb = require('../../lib/repository/couchdb'),
    EventEmitter = require('events').EventEmitter;

describe('couchdb', function() {
  var couchdb;

  beforeEach(function() {
    couchdb = new CouchDb('cqrs');
  })

  describe('instance', function() {
    it('should get instance of couchdb', function() {
      var couchdb = CouchDb.getInstance()
      expect(typeof couchdb.request).toEqual('function');
    })

    it('should return just one instance', function() {
      var couch1 = CouchDb.getInstance(),
          couch2 = CouchDb.getInstance();

      couch1.database = 'foobar';

      expect(couch2.database).toEqual('foobar')
    })
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

  describe('storeEvent', function() {
    it('should call create document', function() {
      spyOn(couchdb, 'createDocument');
      spyOn(Date.prototype, 'getTime').andCallFake(function() { return 123456; })

      couchdb.storeEvent(1, 'user:created', {foo: 'bar'});

      expect(couchdb.createDocument).toHaveBeenCalledWith(JSON.stringify({
        aggregateId: 1,
        name: 'user:created',
        type: 'event',
        time: 123456,
        attrs: {foo: 'bar'}
      }));
    })
  })

  describe('getEventsByAggregate', function() {
    it('should call request', function() {
      spyOn(couchdb, 'request');

      couchdb.getEventsByAggregate(1, function() {});

      expect(couchdb.request).toHaveBeenCalledWith({
        method : 'GET',
        path : '/cqrs/_design/cqrs/_view/aggregate?startkey=[1,0]&endkey=[1,9999999999999]'
      }, jasmine.any(Function));
    })

    it('should call parseEvents', function() {
      var f = function() {}
      spyOn(couchdb, 'parseEvents');
      spyOn(couchdb, 'request').andCallFake(function(data, callback) {
        callback('data');
      })

      couchdb.getEventsByAggregate(1, f);

      expect(couchdb.parseEvents).toHaveBeenCalledWith('data', f);
    })
  })

  describe('getEventsByType', function() {
    beforeEach(function() {
      spyOn(couchdb, 'request').andCallFake(function(data, callback) {
        callback('{"rows": [{"_id":1, "_ref":1, "value": {"foo": "bar"}}]}');
      })
    })

    it('should call request', function() {
      couchdb.getEventsByName('foo', function() {});

      expect(couchdb.request).toHaveBeenCalledWith({
        method: 'GET', 
        path: '/cqrs/_design/cqrs/_view/name?startkey=["foo",0]&endkey=["foo",9999999999999]'
      }, jasmine.any(Function));
    })

    describe('with event list', function() {
      it('should call request for each event', function() {
        couchdb.getEventsByName(['foo', 'bar'], function() {});

        expect(couchdb.request).toHaveBeenCalledWith({
          method: 'GET', 
          path: '/cqrs/_design/cqrs/_view/name?startkey=["foo",0]&endkey=["foo",9999999999999]'
        }, jasmine.any(Function));

        expect(couchdb.request).toHaveBeenCalledWith({
          method: 'GET', 
          path: '/cqrs/_design/cqrs/_view/name?startkey=["bar",0]&endkey=["bar",9999999999999]'
        }, jasmine.any(Function));
      })

      it('should call callback just once', function() {
        var foo = {f: function() {}}
        spyOn(foo, 'f');

        couchdb.getEventsByName(['foo', 'bar'], foo.f);

        expect(foo.f).toHaveBeenCalled();
        expect(foo.f.callCount).toEqual(1);
      })
    })


    it('should call parseEvents', function() {
      var f = function() {}
      spyOn(couchdb, 'parseEvents');

      couchdb.getEventsByName('foo', f);

      expect(couchdb.parseEvents).toHaveBeenCalledWith('{"rows": [{"_id":1, "_ref":1, "value": {"foo": "bar"}}]}', f);
    })
  })
})