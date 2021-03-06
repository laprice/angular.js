var reader = require('./reader.js'),
    ngdoc = require('./ngdoc.js'),
    writer = require('./writer.js'),
    SiteMap = require('./SiteMap.js').SiteMap,
    appCache = require('./appCache.js').appCache,
    Q = require('qq');

process.on('uncaughtException', function(err) {
  console.error(err.stack || err);
});

var start = now();
var docs;

writer.makeDir('build/docs/syntaxhighlighter').then(function() {
  console.log('Generating Angular Reference Documentation...');
  return reader.collect();
}).then(function generateHtmlDocPartials(docs_) {
  docs = docs_;
  ngdoc.merge(docs);
  var fileFutures = [];
  docs.forEach(function(doc){
    // this hack is here because on OSX angular.module and angular.Module map to the same file.
    var id = doc.id.replace('angular.Module', 'angular.IModule').
                    replace(':', '_'); // rewrite : to _ to be GAE-friendly
    fileFutures.push(writer.output('partials/' + doc.section + '/' + id + '.html', doc.html()));
  });

  writeTheRest(fileFutures);

  return Q.deep(fileFutures);
}).then(function generateManifestFile() {
  return appCache('build/docs/').then(function(list) {
    writer.output('appcache-offline.manifest', list);
  });
}).then(function printStats() {
  console.log('DONE. Generated ' + docs.length + ' pages in ' + (now()-start) + 'ms.' );
}).end();


function writeTheRest(writesFuture) {
  var metadata = ngdoc.metadata(docs);

  writesFuture.push(writer.copyDir('img'));
  writesFuture.push(writer.copyDir('font'));

  var manifest = 'manifest="/build/docs/appcache.manifest"';

  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index.html',
                                writer.replace, {'doc:manifest': ''})); //manifest //TODO(i): enable

  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index-nocache.html',
                                writer.replace, {'doc:manifest': ''}));


  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index-jq.html',
                                writer.replace, {'doc:manifest': ''}));

  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index-jq-nocache.html',
                                writer.replace, {'doc:manifest': ''}));


  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index-debug.html',
                                writer.replace, {'doc:manifest': ''}));

  writesFuture.push(writer.copy('docs/src/templates/index.html', 'index-jq-debug.html',
                                writer.replace, {'doc:manifest': ''}));

  writesFuture.push(writer.copyTpl('offline.html'));
  writesFuture.push(writer.copyTpl('docs-scenario.html'));
  writesFuture.push(writer.copyTpl('js/jquery.min.js'));
  writesFuture.push(writer.copyTpl('js/jquery.js'));

  writesFuture.push(writer.output('js/docs-keywords.js',
                                ['NG_PAGES=', JSON.stringify(metadata).replace(/{/g, '\n{'), ';']));
  writesFuture.push(writer.output('sitemap.xml', new SiteMap(docs).render()));
  writesFuture.push(writer.output('docs-scenario.js', ngdoc.scenarios(docs)));
  writesFuture.push(writer.output('robots.txt', 'Sitemap: http://docs.angularjs.org/sitemap.xml\n'));
  writesFuture.push(writer.output('appcache.manifest',appCache()));
  writesFuture.push(writer.copyTpl('.htaccess'));

  writesFuture.push(writer.copy('docs/src/templates/js/docs.js', 'js/docs.js'));

  writesFuture.push(writer.copy('docs/src/templates/css/bootstrap.min.css', 'css/bootstrap.min.css'));
  writesFuture.push(writer.copy('docs/src/templates/css/docs.css', 'css/docs.css'));
  writesFuture.push(writer.copy('docs/src/templates/css/font-awesome.css', 'css/font-awesome.css'));

  writesFuture.push(writer.copyTpl('font/fontawesome-webfont.eot'));
  writesFuture.push(writer.copyTpl('font/fontawesome-webfont.svg'));
  writesFuture.push(writer.copyTpl('font/fontawesome-webfont.svgz'));
  writesFuture.push(writer.copyTpl('font/fontawesome-webfont.ttf'));
  writesFuture.push(writer.copyTpl('font/fontawesome-webfont.woff'));

  writesFuture.push(writer.copyTpl('app.yaml'));
  writesFuture.push(writer.copyTpl('index.yaml'));
  writesFuture.push(writer.copyTpl('favicon.ico'));
  writesFuture.push(writer.copyTpl('main.py'));
}


function now() { return new Date().getTime(); }

function noop() {};
