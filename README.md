# mock-web-server [![Build Status](https://secure.travis-ci.org/osher/mock-web-server.png?branch=master)](http://travis-ci.org/osher/mock-web-server) [![Coverage Status](https://coveralls.io/repos/github/osher/mock-web-server/badge.svg)](https://coveralls.io/github/osher/mock-web-server)
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

## Example - the common simple case:
This example uses a simple static response descriptor.
Every time the server receives a request - it will:
1. capture a REPL-friendly detailed view of the request.
2. respond with the same respopnse, no matter what are the characteristics of the request.

You can replace the response descriptor using `svr.reset(newResponseDescriptor)`.

This example uses mocha, however - it can be used with every any test runner.

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

## Example - logic for dynamic responses
(since: `0.9.2`)

In most cases, a static response to a single API is enough.
However, sometimes you need your mock server to support few endpoints, and/or control for a non-idempotent API that accumulates state between responses.

For this, you can provide an `preResponse` hook. The hook can map an accepted request to a response, or mutate the response object behind the server.
* The hook should be synchronous.
* The hook is passed the accepted request view as a 1st argument.
* The hook is passed the response descriptor the server holds as a 2nd parameter.
* The hook is also called on the context of the response descriptor.

The server will keep collecting REPL-friendly views of the accepted requests as usual, so you can ask it what it heard from your tested client.

### mapper preResponse hook

If you return a value from your preResponse hook - its props cascades their equivalents on the response descriptor  the server holds.

In this example, the response descriptor the sever is initiated with defaults to a reply of *Not-found*. However, when the uri represents a supported entry -  the returned object cascades the `status: 200` and the `body` for that entry.

```js
    const routes = {
      '/api/user/1': { name: 'John Snow '},
      '/api/user/2': { name: 'John Doe '},
    };
    const svr = mockSvrFactory({
      status: 404,
      headers: {
        'Content-Type': 'application/json; charset: utf-8',
      },
      body: { err: 'not-found' },
      preResponse: ({ uri }) => routes[uri] && ({ status: 200, body: this.routes[uri] }),
    });
```

### mutator preResponse hook

Using the hook as a mutator lets you manage a simple in-memory state on the response descriptor.
If you don't want to manage it in a closure - you can use this object as a context object.

The response descriptor is both passed to the hook as a 2nd argument, and used as the context on which the hook is called, so you can use `this`, or an arrow-function according to your preferences.

This example uses a queue of bodies on the response descriptor, and accesses it via the `this` keyword.

```js
    const faker = require('faker');
    const svr = mockSvrFactory({
      queue: [{ one: 1 }, { two: 2 }, { three: 3 }],
      preResponse: ({ method }, response) => {
        const body = this.queue.unshift();
        if (!body) return { status: 404, body: { status: 'empty' } };

        return { status: 200, body };
      },
    });
```

This example uses a `sum` counter on the response desriptor, and accesses it via the 2nd argument:

```js
    const svr = mockSvrFactory({
      sum: 0,
      preResponse: ({ body: { sum = 0 } }, response) => {
        this.sum += sum;
        return { status: 200, body: { requests: svr.accepted.length, sum: this.sum } };
      },
    });
```

## Specs

``` 

  mock-web-server
    ✓ should be a factory function that names 1 arguments - response (it has an optional 2nd param for options)
    when provided only a response object
      ✓ should not fail and return an server instance
    when provided a response object and the optional config object
      ✓ should not fail and return an server instance
    a server instance obtained by the factory
      supported API:
        ✓ method .listen(port, done) to start the server
        ✓ method .close(done) to close it
        ✓ attribute .response as the provided response
        ✓ attribute .accepted as array of accepted requests
        ✓ method .reset() to clear the accepted requests and optionally - reset the response
      starting and closing the server should work
        and the server should serve requests with
          ✓ the provided status code
          ✓ the provided headers
          ✓ the provided body
        and server keeps a REPL-friendly view of the accepted requests that is cleared with .reset()
          ✓ found 3 requests
          ✓ views are serializable
          ✓ .reset() returns the interface and clears the accepted array
          ✓ .reset(response) returns the interface and sets the response
          structure of a request view should contain
            ✓ httpVersion
            ✓ method
            ✓ url
            ✓ headers
            ✓ rawHeaders
            ✓ upgrade
            ✓ body
            ✓ trailers
            ✓ rawTrailers
      when response object has a preResponse hook
        and the response hook returns an object
          the server should serve request with response returned by the hook
            ✓ the provided status code
            ✓ the provided headers
            ✓ the provided body
        and the response hook mutates current response using `this`
          the server should serve request with response mutated by the hook
            ✓ the provided status code
            ✓ the provided headers
            ✓ the provided body
      closing the server with a callback
        ✓ should call the callback as well as closing the server
      an error passed by body-parser
        ✓ should be collected to the request view as .parseError

  ~internals
    .mapParsers(parsers)
      ✓ should be a function that names 1 argument - parsers
      when called with an object element
        ✓ should not fail
      when called with a function element
        ✓ should not fail
      when called with a string element that is not a body-parser built-in
        ✓ should not fail and map it to an instance produced by the required module
      when called with an object element who's first key is not a body-parser built-in
        ✓ should not fail
        ✓ should map it to an instance produced by the required module
        ✓ should pass it the arguments


  39 passing (53ms)

``` 
