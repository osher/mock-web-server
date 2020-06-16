# mock-web-server [![Build Status](https://secure.travis-ci.org/osher/mock-web-server.png?branch=master)](http://travis-ci.org/osher/mock-web-server) [![Coverage Status](https://coveralls.io/repos/github/osher/mock-web-server/badge.svg)](https://coveralls.io/github/osher/mock-web-server)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fosher%2Fmock-web-server.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fosher%2Fmock-web-server?ref=badge_shield)
A lightweight simple helper utility to mock web-servers

## Synopsis
Consider working on a API web client whose concerns are:
 - format user-provided arguments into the web protcol and fire the request
 - expect a reply in a given format
 - unwrap data from protocol envelopes and yield/resolve them to the user
 - handle net, http and logical errors

Consider the API server to be an expansive resource to access:
 - it could require API keys
 - it could be tethering your requests and fail builds
 - it risk resulting with monetary transactions
 - or whatever reason that drove you to decide to develop with a mock server
 
 
This utility helps you launch the simplest tiniest nodejs actual web-server, 
bind it to a port and configure it to play the role of the real API server.

**But the real intention is to faciliate testing.** 
The good part - is that you run it in-process to your test suite, 
and therefore can inspect progrmatically what requests it received (and perform asserts against them)
and easily manipulate the response it emits.

## Example
This example uses mocha, however - it can be used with every test runner for node.

```javascript
const mockSvrFactory = require('mock-web-server');
const sut = require('../lib/my-web-client');
const Should = require('should');
const request = require('request');

describe('lib/my-web-client', () => {
  let client;
  before(() => client = sut({baseUrl: "http://localhost:3030"}));

  it('should be a module object',
    () => Should(sut).be.an.Object()
  );
  it('should have .get API', () => {
    () => Should(sut).have.properties(['get'])
  });
  
  describe('when calling .get(id) with a valid id', () =>  {
    let svr = mockSvrFactory({
      status: 200,
      headers: { 'content-type' : 'application/json' },
      body: { 
        status: 'OK', 
        data: {
          entity: { id: 333, note: 'it is what it is' }
        }
      }
    });
    before((done) => svr.listen(3030, done));
    after(() => svr.close());
    
    
    describe('and the server responds with valid response', () => {
      let foundErr, foundRes;
      beforeAll(() => {
        svr.reset()
        return client.get(333)
          .then(entity => foundRes = entity)
          .catch(err => foundErr = err)
      });
      
      it('should send content type header (app/json)', () =>  {
        Should(svr.accepted[0])
          .have.property('headers')
          .have.property('content-type', 'application/json')
      });
  
      it('should hit the correct URL', () =>  {
        Should(svr.accepted[0])
          .have.properties({
            method: 'GET',
            url: 'http://localhost:3030/entity/333'
          })
      });
      
      it('should resolve to the entity, unwrapped from protocol envelopes', () => {
        Should(foundRes).eql({ id: 333, note: 'it is what it is' })
      })
    })
    
    describe('and the server responds with a malformed response', () => {
      let foundErr, foundRes;
      beforeAll(() => {
        //replace the response to a malformed response
        svr.reset({status: 200, body: {}, headres: {} });
        return client.get(333)
          .then(entity => foundRes = entity)
          .catch(err => foundErr = err)
      })
      
      it('should reject with a friendly error', () => {
        Should(foundErr).have.property('message').match(/Bad response from backend service/)
        Should(foundErr).have.property('id', 333);
        Should(foundErr).have.property('innerError').be.an.Error();
      })
    })
    
    describe('and the server does not respond at all', () => {
      let foundErr, foundRes;
      beforeAll(() => {
        //replace the response to a malformed response
        svr.close();
        return client.get(333)
          .then(entity => foundRes = entity)
          .catch(err => foundErr = err)
      })
      
      it('should reject with a friendly error', () => {
        Should(foundErr).have.property('message').match(/No response from backend service/)
        Should(foundErr).have.property('id', 333);
        Should(foundErr).have.property('innerError').be.an.Error();
      })      
    })
  })
})


```


## Specs

``` 


  mock-web-server
    √ should be a factory function that names 1 arguments - response (it has an optional 2nd param for options)
    when provided only a response object
      √ should not fail and return an server instance
    when provided a response object and the optional config object
      √ should not fail and return an server instance
    a server instance obtained by the factory
      supported API:
        √ method .listen(port, done) to start the server
        √ method .close(done) to close it
        √ attribute .response as the provided response
        √ attribute .accepted as array of accepted requests
        √ method .reset() to clear the accepted requests and optionally - reset the response
      starting and closing the server should work
        and the server should serve requests with
          √ the provided status code
          √ the provided headers
          √ the provided body
        and server keeps a REPL-friendly view of the accepted requests that is cleared with .reset()
          √ found 3 requests
          √ views are serializable
          √ .reset() returns the interface and clears the accepted array
          √ .reset(response) returns the interface and sets the response
          structure of a request view should contain
            √ httpVersion
            √ method
            √ url
            √ headers
            √ rawHeaders
            √ upgrade
            √ body
            √ trailers
            √ rawTrailers
      closing the server with a callback
        √ should call the callback as well as closing the server
      an error passed by body-parser
        √ should be collected to the request view as .parseError

  ~internals
    .mapParsers(parsers)
      √ should be a function that names 1 argument - parsers
      when called with an object element
        √ should not fail
      when called with a function element
        √ should not fail
      when called with a string element that is not a body-parser built-in
        √ should not fail and map it to an instance produced by the required module
      when called with an object element who's first key is not a body-parser built-in
        √ should not fail
        √ should map it to an instance produced by the required module
        √ should pass it the arguments


  33 passing (94ms)

``` 


## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fosher%2Fmock-web-server.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fosher%2Fmock-web-server?ref=badge_large)