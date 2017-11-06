# mock-web-server
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
