const bodyParser = require('body-parser')
module.exports = (response, { bodyParsers = ['json','raw','text','urlencoded']}) => {
    //support array of: 
    //  - string - name of factory to invoke without settings
    //    if name is not found to be a method of body-parser - it's assumed to be a module to require
    //  - object who's first key is parser type and value is configs to pass to this factory
    //    if name is not found to be a method of body-parser - it's assumed to be a module to require
    //  - custom body-parser function
    const parsers = bodyParsers.map(parser => {
      switch(typeof parser) {
        case 'string': 
          return bodyParser[parser] ? bodyParser[parser]() : require(parser)()
        case 'object': 
          for (type in parser)
            return bodyParser[type] ? bodyParser[type](parser[type]) : require(parser)(parser[type])
        case 'function':
        default:
          return parser
      }
    });
    const svr = require('http').createServer((q,r) => {
        parseBody(bodyParser[parser], q,r, (parseError) => {
            {//keep a REPL-friendly request view
              const {httpVersion, method, url, query, headers, rawHeaders, body} = q;
              accepted.push({httpVersion, method, url, query, headers, rawHeaders, parseError, body});
            }
            {//emit headers
              const {headers} = headers;
              Object.keys(headers).forEach(h => r.setHeader(header, headers[h]))
            }
            r.statusCode = response.status || 200;
            r.end( JSON.stringify(response.body) )
       })
    });
    const accepted = [];
    //return a REPL friendly interface module
    return {
      response,
      accepted,
      clear: () => { accepted.length = 0 },
      listen: (...args) => { svr.listen.apply(svr, args) },
      close: (done) => svr.close(done)
    }
}

function parseBody(parsers, q, r, done) {
    let i = 0;
    next()
    function next(e) {
        if (e) return done(e);
        const parser = parsers[i++];
        if (!parser) return done();
        parser(q,r, next)
    }
}