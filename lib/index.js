const bodyParser = require('body-parser');
const mockSvrFactory = module.exports = (response, { bodyParsers = ['json','raw','text',{urlencoded:{extended:true}}]} = {}) => {
    //support array of: 
    //  - string - name of factory to invoke without settings
    //    if name is not found to be a method of body-parser - it's assumed to be a module to require
    //  - object who's first key is parser type and value is configs to pass to this factory
    //    if name is not found to be a method of body-parser - it's assumed to be a module to require
    //  - custom body-parser function
    const parsers = mockSvrFactory.mapParsers(bodyParsers);
    //a REPL-friendly request view
    const collectAccepted = ({ httpVersion, method, url, headers, rawHeaders, upgrade, body, trailers, rawTrailers }, parseError) => {
      const mapped = {httpVersion, method, url, headers, rawHeaders, upgrade, parseError, body, trailers, rawTrailers};
      accepted.push(mapped);
      return mapped;
    };
    const svr = require('http').createServer((q,r) => {
        parseBody(parsers, q,r, (parseError) => {
            const acc = collectAccepted(q, parseError);
            {//emit response
              const { status, body, headers = {} } =
                'function' == typeof response.preResponse
                  ? Object.assign({}, response, response.preResponse(acc, response) || response)
                  : response;
              Object.keys(headers).forEach(h => r.setHeader(h, headers[h]))
              r.statusCode = status || 200;
              r.end( JSON.stringify(body) )
            }
       })
    });
    const accepted = [];
    //return a REPL friendly interface module
    const impl =  {
      response,
      accepted,
      reset: (r) => { accepted.length = 0; if (r) impl.response = response = r; return impl },
      listen: (...args) => { svr.listen.apply(svr, args); return impl },
      close: (done) => { svr.close(); if (done) done() }
    }
    return impl
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

module.exports.mapParsers = (bodyParsers) => bodyParsers.map(parser => {
    switch(typeof parser) {
      case 'string': 
        return bodyParser[parser] ? bodyParser[parser]({}) : require(parser)({})
      case 'object': 
        for (type in parser)
          return bodyParser[type] ? bodyParser[type](parser[type]) : require(type)(parser[type])
      case 'function':
      default:
        return parser
    }
  });
  