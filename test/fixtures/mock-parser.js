module.exports = (opts) => { 
    module.exports.opts = opts;
    return (q,r,n) => n(opts.throw) 
}
