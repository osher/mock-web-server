'use strict';
const request = require('request');
const asyn = require('async');
const sut = require('../');

var svr;

module.exports = 
{ "mock-web-server" :
  { "should be a factory function that names 1 arguments - response (it has an optional 2nd param for options)" :
      () => Should(sut).be.a.Function().have.property('length', 1)
  , "when provided only a response object" :
    {  beforeAll: () => { try { svr = sut({}) } catch(e) { svr = e } }
    , "should not fail and return an server instance" :  () => Should(svr).not.be.an.Error()
    }
  , "when provided a response object and the optional config object" :
    {  beforeAll: () => { try { svr = sut({}, {}) } catch(e) { svr = e } }
    , "should not fail and return an server instance" :  () => Should(svr).not.be.an.Error()
    }
  , "a server instance obtained by the factory" : block(() => {
        const response = {status: 201, headers: {'x-foo': 'bar'}, body: {ok: true}};
        let foundRes;
        let foundErr;
        return {
          beforeAll: () => { svr = sut(response) }
        , "supported API:" : 
          { "method .listen(port, done) to start the server" : 
            () => Should(svr).have.property('listen').be.a.Function()
          , "method .close(done) to close it" : 
            () => Should(svr).have.property('close').be.a.Function()
          , "attribute .response as the provided response" : 
            () => Should(svr).have.property('response').equal(response)
          , "attribute .accepted as array of accepted requests" : 
            () => Should(svr).have.property('accepted').be.an.Array()
          , "method .reset() to clear the accepted requests and optionally - reset the response": 
            () => Should(svr).have.property('reset').be.a.Function()
          }
        , "starting and closing the server should work" :
          { timeout: "5s"
          , beforeAll: 
            (next) => svr.listen(3030, next)
          , "and the server should serve requests with" :
            { beforeAll: 
              (next) => request({ url: 'http://localhost:3030/', json: true }, (e, r) => {
                  foundErr = e;
                  foundRes = r;
                  next()
              })
            , "the provided status code" :
              () => Should(foundRes).have.property('statusCode', response.status)
            , "the provided headers" :
              () => Should(foundRes).have.property('headers').have.property('x-foo', 'bar')
            , "the provided body" :
              () => Should(foundRes).have.property('body').eql(response.body)
            }
          , "and server keeps a REPL-friendly view of the accepted requests that is cleared with .reset()" :
            { beforeAll:
              (done) => {
                  svr.reset();
                  asyn.waterfall([
                    (next) => request({ url: 'http://localhost:3030/qq', json: true }, () => next()),
                    (next) => request({ url: 'http://localhost:3030/aa', method: 'POST', json: true }, () => next()),
                    (next) => request({ url: 'http://localhost:3030/bb', json: true }, () => next()),
                  ], done)
              }
            , "found 3 requests": 
              () => Should(svr.accepted).have.property('length', 3)
            , "views are serializable":  //will throw on circular references...
              () => JSON.stringify( svr.accepted )
            , "structure of a request view should contain" : 
              "httpVersion, method, url, headers, rawHeaders, upgrade, body, trailers, rawTrailers"
                .split(', ')
                .reduce((suite, key) => Object.assign(suite, 
                  { [key]: 
                    () => Should( svr.accepted.find( res => 'undefined' == typeof res[key] ) ).be.Undefined()
                  })
                , {}
                )
            , ".reset() returns the interface and clears the accepted array" :
              () => Should(svr.reset())
                .have.property('accepted')
                .be.an.Array()
                .have.property('length', 0)
            , ".reset(response) returns the interface and sets the response" : 
              () => Should(svr.reset({set: true}))
                .have.property('response', {set: true})
            }
          , afterAll: 
            () => svr.close()
          }
        , "closing the server with a callback" : 
          { "should call the callback as well as closing the server" :
            (done) => asyn.waterfall([
              (next) => svr.listen(3030, next),
              (next) => svr.close(next)
            ], done)
          }
        , "an error passed by body-parser" : 
          { beforeAll:
            (done) => { 
                svr = sut({}, { bodyParsers: 
                  [ { "../test/fixtures/mock-parser" :
                      { throw: Object.assign(new Error('oups'), {mock: 'yup, it is'})
                      }
                    }
                  ]
                });
                foundRes = foundErr = null;
                asyn.waterfall(
                  [ (next) => svr.listen(3030, next)
                  , (next) => request('http://localhost:3030/foo', (e, r) => { next() })
                  ]
                , done
                )
            }
          , afterAll:
            () => svr.close()
          , "should be collected to the request view as .parseError" :
            () => Should(svr.accepted[0])
              .have.property('parseError')
              .have.property('mock', 'yup, it is')
          }
        }
    })
  }
, "~internals" : 
  { ".mapParsers(parsers)" : 
    { "should be a function that names 1 argument - parsers" :
      () => Should(sut.mapParsers).be.a.Function().have.property('length', 1)
    , "when called with an object element" : 
      { "should not fail" :
        () => Should(sut.mapParsers([{json: {special: "options"}}])).be.an.Array().have.property('length',1)
      }
    , "when called with a function element" :
      { "should not fail" :
        () => Should(sut.mapParsers([(q,r,n) => n()])).be.an.Array().have.property('length',1)
      }
    , "when called with a string element that is not a body-parser built-in" : 
      {  "should not fail and map it to an instance produced by the required module" :
        () => Should(sut.mapParsers(["../test/fixtures/mock-parser"])).be.an.Array().have.property('length',1)
      }
    , "when called with an object element who's first key is not a body-parser built-in" : 
      block(() => { 
          let res;
          let err;
          return { 
            beforeAll:  
            () => { 
              try{ res = sut.mapParsers([ {"../test/fixtures/mock-parser": { foo: 'bar' }}]) } 
              catch(e) { err = e } 
            }
          , "should not fail" : 
            () => Should.not.exist(err)
          , "should map it to an instance produced by the required module" :
            () => Should(res).be.an.Array().have.property('length',1)
          , 'should pass it the arguments' : 
            () => Should(require('../test/fixtures/mock-parser').opts).eql( {foo: 'bar'} )
          }
      })
    }
  }
}
