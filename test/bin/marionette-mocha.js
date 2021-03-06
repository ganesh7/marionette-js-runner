suite('mocha integration', function() {
  var fs = require('fs');

  function aggregateOutput(childProcess) {
    var result = {
      stderr: '',
      stdout: ''
    };

    childProcess.stderr.on('data', function(input) {
      result.stderr += input.toString();
    });

    childProcess.stdout.on('data', function(input) {
      result.stdout += input.toString();
    });

    return result;
  }

  var MS_REGEXP = /(([0-9]+) ms)/;
  var NEW_LINES = /(\n|(\s{2,}))/g;
  function waitForProcess(child, done) {
    var result = aggregateOutput(child);
    child.on('exit', function(code) {
      // there are very small newline/whitespace differences between
      // mocha and our marionette reporter... these probably are not
      // bugs but prevent us from verifying real content so they are stripped.
      ['stderr', 'stdout'].forEach(function(field) {
        [MS_REGEXP, NEW_LINES].forEach(function(regex) {
          result[field] = result[field].replace(regex, '');
        });
      });

      // exit status is _really_ important
      result.code = code;
      done();
    });

    return result;
  }

  var tests = [
    // this also tests picking up mocha.opts
    ['test', ['--reporter', 'spec']],
    ['pending', ['--reporter', 'spec']],
    ['with-helper', ['--require', __dirname + '/fixtures/helper.js']]
  ];

  tests.forEach(function(pair) {
    var file = pair[0];
    var path = __dirname + '/fixtures/' + file;

    var argv = [path].concat(pair[1]);

    // run same test with same options on both mocha & our marionette proxy
    // runner.
    suite(file, function() {
      var mochaOut;
      var marionetteOut;

      setup(function(done) {
        var proc = spawnMocha(argv);
        mochaOut = waitForProcess(proc, done);
      });

      setup(function(done) {
        var proc = spawnMarionette(argv);
        marionetteOut = waitForProcess(proc, done);
      });

      test('code', function() {
        assert.equal(mochaOut.code, marionetteOut.code);
      });

      test('stdout', function() {
        assert.equal(mochaOut.stdout, marionetteOut.stdout);
      });

      test('stderr', function() {
        assert.equal(mochaOut.stderr, marionetteOut.stderr);
      });
    });
  });

});
