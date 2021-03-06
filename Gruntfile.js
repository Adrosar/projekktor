module.exports = function (grunt) {

  "use strict";
  grunt.file.defaultEncoding = 'utf-8';

  var 
    pkg = grunt.file.readJSON("package.json"),
    ver = pkg.version,
    name = grunt.option('name') || '',
    dest = grunt.option('dest') || 'dest/',
    pluginspath = grunt.option('pluginspath') || 'plugins/',
    lang = grunt.option('lang') || 'en', 
    version = (name!=='') ? (grunt.option('ver') || ver) + "." + name : (grunt.option('ver') || ver),
    distpaths = [
      "dist/projekktor-" + version + ".js",
      "dist/projekktor-" + version + ".min.map",
      "dist/projekktor-" + version + ".min.js"
    ],
    filesUglify = {},
    gzip = require("gzip-js"),
    readOptionalJSON = function (filepath) {
      var data = {};
      try {
        data = grunt.file.readJSON(filepath);
      } catch (e) {}
      return data;
    },
    srcHintOptions = readOptionalJSON("src/.jshintrc");

  filesUglify["dist/projekktor-" + version + ".min.js"] = ["dist/projekktor-" + version + ".js"];
  dest = dest + name + "/";
  grunt.file.mkdir(dest);
  
  grunt.initConfig({
    pkg: pkg,
    dst: readOptionalJSON("dist/.destination.json"),
    compare_size: {
      files: ["dist/projekktor-" + version + ".js", "dist/projekktor-" + version + ".min.js"],
      options: {
        compress: {
          gz: function (contents) {
            return gzip.zip(contents, {}).length;
          }
        },
        cache: "dist/.sizecache.json"
      }
    },
    build: {
      all: {
        dest: "dist/projekktor-" + version + ".js",
        src: [
          "src/controller/projekktor.js",
          "src/controller/projekktor.config.version.js",
          "src/controller/projekktor.config.js",
          "src/controller/projekktor.utils.js",
          "src/controller/projekktor.useragent.js",
          "src/controller/projekktor.features.js",
          "src/controller/projekktor.fullscreenapi.js",
          "src/controller/projekktor.persistentstorage.js",
          "src/controller/projekktor.platforms.js",
          "src/controller/projekktor.plugininterface.js",
          "src/controller/projekktor.messages." + lang + ".js",
          "src/models/player.js",
          "src/models/player.NA.js",
          "src/models/player.audio.video.js",
          "src/models/player.audio.video.hls.js",
          "src/models/player.playlist.js",
          "src/models/player.image.html.js",              
          {flag: "osmf", src: "src/models/player.audio.video.osmf.js"},
          {flag: "osmfhls", src: "src/models/player.audio.video.osmf.hls.js"},
          {flag: "osmfmss", src: "src/models/player.audio.video.osmf.mss.js"},
          {flag: "silverlight", src: "src/models/player.audio.video.silverlight.js"},
          {flag: "msehls", src: "src/models/player.audio.video.mse.hls.js"},
          {flag: "videojs", src: "src/models/player.videojs.js"},
          {flag: "youtube", src: "src/models/player.youtube.js" }, 
          "src/plugins/projekktor.display.js",
          "src/plugins/projekktor.controlbar.js",
          "src/plugins/projekktor.contextmenu.js",
          "src/plugins/projekktor.settings.js", 
          {user:true, flag: "plugins/ads", src: "ads", ver: true },
          {user:true, flag: "plugins/ima", src: "ima", ver: true },
          {user:true, flag: "plugins/logo", src: "logo" , ver: true},
          {user:true, flag: "plugins/postertitle", src: "postertitle", ver: true },
          {user:true, flag: "plugins/share", src: "share", ver: true },
          {user:true, flag: "plugins/tracking", src: "tracking", ver: true },
          {user:true, flag: "plugins/tracks", src:  "tracks", ver: true },
          {user:true, flag: "plugins/audioslideshow", src:  "audioslideshow", ver: true },
          {user:true, flag: "plugins/vastdemo", src:  "vastdemo", ver: true }        
        ]
      }
    },
    platforms: {
        videojs: {

        }
    },
    concat: {
      vpaidvideojs: {
        files: {
          'platforms/videojs/videojs.vpaid.css': ['platforms/videojs/video-js.css', 'platforms/videojs/videojs.vast.vpaid.css', 'platforms/videojs/videojs-projekktor-model-custom.css'],
          'platforms/videojs/videojs.vpaid.js': ['platforms/videojs/video.js', 'platforms/videojs/videojs_5.vast.vpaid.js']
        }
      }
    },
    jshint: {
      dist: {
        src: ["dist/projekktor-" + version + ".js"],
        options: srcHintOptions
      },
      grunt: {
        src: ["Gruntfile.js"],
        options: {
          jshintrc: ".jshintrc"
        }
      },
      tests: {
        // TODO: Once .jshintignore is supported, use that instead.
        // issue located here: https://github.com/gruntjs/grunt-contrib-jshint/issues/1
        src: ["test/data/{test,testinit,testrunner}.js", "test/unit/**/*.js"],
        options: {
          jshintrc: "test/.jshintrc"
        }
      }
    },
    bump: {
      options: {
        files: ['package.json', 'src/controller/projekktor.config.version.js'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Bump version to %VERSION%',
        commitFiles: ['package.json',  'src/controller/projekktor.config.version.js'],
        createTag: true,
        tagName: 'tvplayer-%VERSION%',
        tagMessage: 'Projekktor for TVPlayer %VERSION%',
        push: false,
        pushTo: 'upstream',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: false,
        metadata: '',
        regExp: /([\"\']?version[\"\']?\s*?[:=]\s*?[\'\"])(\d+\.\d+\.\d+(-\.\d+)?(-\d+)?)[\d||A-a|.|-]*(['|"]?)/i
      }
    },
    watch: {
      files: ["<%= jshint.grunt.src %>", "<%= jshint.tests.src %>", "src/**/*.js"],
      tasks: "dev"
    },

    uglify: {
      all: {
        files: filesUglify,
        options: {
          banner: "/*! Projekktor v<%= pkg.version %>\n" +
          "* <%= grunt.template.today('yyyy-mm-dd') %> \n" +
          "* \n" +
          "* http://www.projekktor.com \n" +
          "* Copyright 2010-2014 Sascha Kluger, Spinning Airwhale Media, http://www.spinningairwhale.com \n" +
          "* Copyright 2014-2016 Radosław Włodkowski, www.wlodkowski.net, radoslaw@wlodkowski.net \n" +
          "* \n" +
          "* under GNU General Public License \n" +
          "* http://www.projekktor.com/license/\n" +
          "*/",
          sourceMap: true,
          sourceMapName: "dist/projekktor-" + version + ".min.map",
          report: "min",
          beautify: {
            ascii_only: true
          },
          compress: {
            hoist_funs: false,
            join_vars: false,
            loops: false,
            unused: false
          },
          mangle: {
            // saves some bytes when gzipped
            except: ["undefined"]
          }
        }
      },
      vpaidvideojs: {
        files: {
          'platforms/videojs/videojs.vpaid.min.js': ['platforms/videojs/video.js', 'platforms/videojs/videojs_5.vast.vpaid.js']
        },
        options: {
          sourceMap: false,
          report: "min",
          beautify: {
            ascii_only: true
          },
          compress: {
            hoist_funs: false,
            join_vars: false,
            loops: false,
            unused: false
          },
          mangle: {
            // saves some bytes when gzipped
            except: ["undefined"]
          }
        }
      }
    },
    clean: {
        all: [dest, 'dist/*.js', 'dist/*.map', 'dist/.*.json']
    },
    readme: {
        src: 'dist/readme.html',  // source template file
        dest: dest + 'readme.html',  // destination file (usually index.html)
        version: version,
        name: name
    },
    copy: {
      main: {
        files: [
          // includes files within path
          // {expand: true, src: ['path/*'], dest: 'dest/', filter: 'isFile'},
          // includes files within path and its sub-directories
          {expand: true, flatten: true, src: ['dist/*' + version + '*'], dest: dest},
          {expand: true, flatten: true, src: ['dist/media/*'], dest: dest + 'media/'},
          {expand: true, src: ['platforms/**'], dest: dest},       
          {expand: true, src: ['themes/**'], dest: dest},
          {expand: true, src: ['readme.html'], dest: dest},
          {expand: true, flatten: true, src: ['lib/jQuery/1.11.2/**'], dest: dest, filter: 'isFile'}
          // makes all src relative to cwd
          // {expand: true, cwd: 'path/', src: ['**'], dest: 'dest/'},
          // flattens results to a single level
          // {expand: true, flatten: true, src: ['path/**'], dest: 'dest/', filter: 'isFile'}
        ]
      },
      platforms: {
        files: [
          {expand: true, cwd:'lib/hls.js/dist/', src:['*.js', '*.map'], dest: 'platforms/mse/hls.js/'},
          {expand: true, cwd:'lib/video.js/dist/', src:['*.js', '*.map', '*.css'], dest: 'platforms/videojs/'},
          {expand: true, cwd:'lib/videojs-vast-vpaid/bin/', src:['videojs_5*.js', 'videojs_5*.js.map', '*.css.map', '*.css', '*.swf'], dest: 'platforms/videojs/'}
        ]
      }
    },
    compress: {
      main: {
        options: {
          archive: dest + "projekktor-" + version + '.zip'
        },
        files: [
          //{src: ['path/*'], dest: 'internal_folder/', filter: 'isFile'}, // includes files in path
          // {src: ['dest/**'], dest: ''}, // includes files in path and its subdirs
          {expand: true, cwd: dest, src: ['**'], dest: ''}, // makes all src relative to cwd
          //{flatten: true, src: ['path/**'], dest: 'internal_folder4/', filter: 'isFile'} // flattens results to a single level
        ]
      }
    }    
  });
  
  
  grunt.registerTask( "readme", "Generate readme.html depending on configuration", function() {
      var conf = grunt.config('readme'),
          tmpl = grunt.file.read(conf.src);

      grunt.file.write(conf.dest, grunt.template.process(tmpl));

      grunt.log.writeln('Generated \'' + conf.dest + '\' from \'' + conf.src + '\'');
  });  

  // Special "alias" task to make custom build creation less grawlix-y
  grunt.registerTask("custom", function () {
    var done = this.async(),
      args = [].slice.call(arguments),
      modules = args.length ? args[0].replace(/,/g, ":") : "";

    // Translation example
    //
    //   grunt custom:+ajax,-dimensions,-effects,-offset
    //
    // Becomes:
    //
    //   grunt build:*:*:+ajax:-dimensions:-effects:-offset

    grunt.log.writeln("Creating custom build..." + version + " " + modules + "\n" + "  " + grunt.option('dest')  +"  " + grunt.option('name'));

    grunt.util.spawn({
      grunt: true,
      args: ["--ver=" + (grunt.option('ver') || 'universal'), "--pluginspath=" + grunt.option('pluginspath') || '', "--dest=" + grunt.option('dest') || '', "--name=" + grunt.option('name') || '', "build:*:" + modules, "uglify", "dist:*", "compare_size", "copy:main", "readme", "compress"]
    }, function (err, result) {
      if (err) {
        grunt.log.writeln(err + " "+ result);
        // grunt.verbose.error();
        // done(err);
        return;
      }

      grunt.log.writeln(result.stdout.replace("Done, without errors.", ""));

      done();
    });

  });

  // Special concat/build task to handle various build requirements
  grunt.registerMultiTask(
    "build",
    "Concatenate source (include/exclude modules with +/- flags), embed date/version",

  function () {
    // Concat specified files.
    var compiled = "",
      modules = this.flags,
      optIn = !modules["*"],
      explicit = optIn || Object.keys(modules).length > 1,
      name = this.data.dest,
      src = this.data.src,
      deps = {},
      excluded = {},
      version = grunt.config("pkg.version"),
      excluder = function (flag, needsFlag) {
        // optIn defaults implicit behavior to weak exclusion
        if (optIn && !modules[flag] && !modules["+" + flag]) {
          excluded[flag] = false;
        }

        // explicit or inherited strong exclusion
        if (excluded[needsFlag] || modules["-" + flag]) {
          excluded[flag] = true;

          // explicit inclusion overrides weak exclusion
        } else if (excluded[needsFlag] === false && (modules[flag] || modules["+" + flag])) {

          delete excluded[needsFlag];

          // ...all the way down
          if (deps[needsFlag]) {
            deps[needsFlag].forEach(function (subDep) {
              modules[needsFlag] = true;
              excluder(needsFlag, subDep);
            });
          }
        }
      };

    // append commit id to version
    if (process.env.COMMIT) {
      version += " " + process.env.COMMIT;
    }

    // figure out which files to exclude based on these rules in this order:
    //  dependency explicit exclude
    //  > explicit exclude
    //  > explicit include
    //  > dependency implicit exclude
    //  > implicit exclude
    // examples:
    //  *                  none (implicit exclude)
    //  *:*                all (implicit include)
    //  *:*:-html           all except css and dependents (explicit > implicit)
    //  *:*:-html:+youtube  same (excludes effects because explicit include is trumped by explicit exclude of dependency)
    //  *:+youtube         none except effects and its dependencies (explicit include trumps implicit exclude of dependency)
    src.forEach(function (filepath, index) {
      
      if (filepath.ver===true) {
        var versionpath =  pluginspath + "/" + filepath.src;
        var dirs = grunt.file.expand({filter: 'isDirectory'}, [versionpath + "/*"]);
        dirs.sort(
          function versionSort($a, $b) {
                  return -1 * version_compare($a, $b);
          }           
        )
      filepath.src = dirs[0] + "/projekktor." + filepath.src + ".js";
      }
      // check for user plugins
      var user = filepath.user;
      if (user && filepath.src) {
        if (!grunt.file.exists(filepath.src)) {
          delete src[index];
          return;
        }
      }

      var flag = filepath.flag;
 
      if (flag) {
        excluder(flag);

        // check for dependencies
        if (filepath.needs) {
          deps[flag] = filepath.needs;
          filepath.needs.forEach(function (needsFlag) {
            excluder(flag, needsFlag);
          });
        }
      }
    });

    // append excluded modules to version
    if (Object.keys(excluded).length) {
      version += " -" + Object.keys(excluded).join(",-");
      // set pkg.version to version with excludes, so minified file picks it up
      grunt.config.set("pkg.version", version);
    }

    // conditionally concatenate source
    src.forEach(function (filepath) {
     
      var flag = filepath.flag,
        specified = false,
        omit = false,
        messages = [];

      if (flag) {
        if (excluded[flag] !== undefined) {
          messages.push([
              ("Excluding " + flag).red,
              ("(" + filepath.src + ")").grey
            ]);
          specified = true;
          omit = !filepath.alt;
          if (!omit) {
            flag += " alternate";
            filepath.src = filepath.alt;
          }
        }
        if (excluded[flag] === undefined) {
          messages.push([
              ("Including " + flag).green,
              ("(" + filepath.src + ")").grey
            ]);

          // If this module was actually specified by the
          // builder, then set the flag to include it in the
          // output list
          if (modules["+" + flag]) {
            specified = true;
          }
        }

        filepath = filepath.src;

        // Only display the inclusion/exclusion list when handling
        // an explicit list.
        //
        // Additionally, only display modules that have been specified
        // by the user
        if (explicit && specified) {
          messages.forEach(function (message) {
            grunt.log.writetableln([27, 30], message);
          });
        }
      }

      if (!omit) {
        compiled += grunt.file.read(filepath);
      }
    });

    // Embed Version
    // Embed Date
    compiled = compiled.replace(/@VERSION/g, version)
    // yyyy-mm-ddThh:mmZ
    .replace(/@DATE/g, (new Date()).toISOString().replace(/:\d+\.\d+Z$/, "Z"));

    // Write concatenated source to file
    grunt.file.write(name, compiled);

    // Fail task if errors were logged.
    if (this.errorCount) {
      return false;
    }

    // Otherwise, print a success message.
    grunt.log.writeln("File '" + name + "' created.");
  });

  // Process files for distribution
  grunt.registerTask("dist", function () {
    var stored, flags, paths, fs, nonascii;

    // Check for stored destination paths
    // ( set in dist/.destination.json )
    stored = Object.keys(grunt.config("dst"));

    // Allow command line input as well
    flags = Object.keys(this.flags);

    // Combine all output target paths
    paths = [].concat(stored, flags).filter(function (path) {
      return path !== "*";
    });

    // Ensure the dist files are pure ASCII
    fs = require("fs");
    nonascii = false;

    distpaths.forEach(function (filename) {
      var i,
      text = fs.readFileSync(filename, "utf8"); 

      // Ensure files use only \n for line endings, not \r\n
      if (/\x0d\x0a/.test(text)) {
        var index = /\x0d\x0a/.exec(text).index;
        var subText = text.substring(0, index);
        var lines = subText.split(/\n/);
        grunt.log.writeln(filename + ": [" + lines.length + "] Incorrect line endings (\\r\\n)");
        nonascii = true;
      }

      // Ensure only ASCII chars so script tags don't need a charset attribute
      /*if (text.length !== Buffer.byteLength(text, "utf8")) {
        grunt.log.writeln(filename + ": Non-ASCII characters detected:");
        for (i = 0; i < text.length; i++) {
          c = text.charCodeAt(i);
          if (c > 127) {
            grunt.log.writeln("- position " + i + ": " + c);
            grunt.log.writeln("-- " + text.substring(i - 20, i + 20));
            break;
          }
        }
        nonascii = true;
      }*/

      // Modify map/min so that it points to files in the same folder;
      // see https://github.com/mishoo/UglifyJS2/issues/47
      if (/\.map$/.test(filename)) {
        text = text.replace(/"dist\//g, "\"");
        fs.writeFileSync(filename, text, "utf-8");

        // Use our hard-coded sourceMap directive instead of the autogenerated one (#13274; #13776)
      } else if (/\.min\.js$/.test(filename)) {
        i = 0;
        text = text.replace(/(?:\/\*|)\n?\/\/@\s*sourceMappingURL=.*(\n\*\/|)/g,

        function (match) {
          if (i++) {
            return "";
          }
          return match;
        });
        fs.writeFileSync(filename, text, "utf-8");
      }

      // Optionally copy dist files to other locations
      paths.forEach(function (path) {
        var created;

        if (!/\/$/.test(path)) {
          path += "/";
        }

        created = path + filename.replace("dist/", "");
        grunt.file.write(created, text);
        grunt.log.writeln("File '" + created + "' created.");
      });
    });

    return !nonascii;
  });

  // Load grunt tasks from NPM packages  
  grunt.loadNpmTasks("grunt-bump");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-compress");
  grunt.loadNpmTasks("grunt-compare-size");
  grunt.loadNpmTasks("grunt-git-authors");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks('grunt-contrib-concat');

  // Default build that mirrors the Projekktor distribution
  grunt.registerTask("default", [
    "clean",
    "build:*:*:+playlist:-youtube:+html:+osmf:+osmfhls:+osmfmss:+msehls:-plugins/logo:-plugins/ima:-plugins/postertitle:-plugins/share:-plugins/tracking",
    "uglify:all",
    "dist:*",
    "compare_size",
    "copy:main",
    "readme",
    "compress"
  ]);

  grunt.registerMultiTask("platforms", "prepare platforms for distribution", function(){
       var target = this.target;

       grunt.task.run("copy:platforms");
       grunt.task.run("concat:vpaidvideojs");
       grunt.task.run("uglify:vpaidvideojs");
  });
};


function version_compare (v1, v2, operator) {
  // http://kevin.vanzonneveld.net
  // +      original by: Philippe Jausions (http://pear.php.net/user/jausions)
  // +      original by: Aidan Lister (http://aidanlister.com/)
  // + reimplemented by: Kankrelune (http://www.webfaktory.info/)
  // +      improved by: Brett Zamir (http://brett-zamir.me)
  // +      improved by: Scott Baker
  // +      improved by: Theriault
  // *        example 1: version_compare('8.2.5rc', '8.2.5a');
  // *        returns 1: 1
  // *        example 2: version_compare('8.2.50', '8.2.52', '<');
  // *        returns 2: true
  // *        example 3: version_compare('5.3.0-dev', '5.3.0');
  // *        returns 3: -1
  // *        example 4: version_compare('4.1.0.52','4.01.0.51');
  // *        returns 4: 1
  // BEGIN REDUNDANT
  this.php_js = this.php_js || {};
  this.php_js.ENV = this.php_js.ENV || {};
  // END REDUNDANT
  // Important: compare must be initialized at 0.
  var i = 0,
    x = 0,
    compare = 0,
    // vm maps textual PHP versions to negatives so they're less than 0.
    // PHP currently defines these as CASE-SENSITIVE. It is important to
    // leave these as negatives so that they can come before numerical versions
    // and as if no letters were there to begin with.
    // (1alpha is < 1 and < 1.1 but > 1dev1)
    // If a non-numerical value can't be mapped to this table, it receives
    // -7 as its value.
    vm = {
      'dev': -6,
      'alpha': -5,
      'a': -5,
      'beta': -4,
      'b': -4,
      'RC': -3,
      'rc': -3,
      '#': -2,
      'p': 1,
      'pl': 1
    },
    // This function will be called to prepare each version argument.
    // It replaces every _, -, and + with a dot.
    // It surrounds any nonsequence of numbers/dots with dots.
    // It replaces sequences of dots with a single dot.
    //    version_compare('4..0', '4.0') == 0
    // Important: A string of 0 length needs to be converted into a value
    // even less than an unexisting value in vm (-7), hence [-8].
    // It's also important to not strip spaces because of this.
    //   version_compare('', ' ') == 1
    prepVersion = function (v) {
      v = ('' + v).replace(/[_\-+]/g, '.');
      v = v.replace(/([^.\d]+)/g, '.$1.').replace(/\.{2,}/g, '.');
      return (!v.length ? [-8] : v.split('.'));
    },
    // This converts a version component to a number.
    // Empty component becomes 0.
    // Non-numerical component becomes a negative number.
    // Numerical component becomes itself as an integer.
    numVersion = function (v) {
      return !v ? 0 : (isNaN(v) ? vm[v] || -7 : parseInt(v, 10));
    };
  v1 = prepVersion(v1);
  v2 = prepVersion(v2);
  x = Math.max(v1.length, v2.length);
  for (i = 0; i < x; i++) {
    if (v1[i] == v2[i]) {
      continue;
    }
    v1[i] = numVersion(v1[i]);
    v2[i] = numVersion(v2[i]);
    if (v1[i] < v2[i]) {
      compare = -1;
      break;
    } else if (v1[i] > v2[i]) {
      compare = 1;
      break;
    }
  }
  if (!operator) {
    return compare;
  }

  // Important: operator is CASE-SENSITIVE.
  // "No operator" seems to be treated as "<."
  // Any other values seem to make the function return null.
  switch (operator) {
  case '>':
  case 'gt':
    return (compare > 0);
  case '>=':
  case 'ge':
    return (compare >= 0);
  case '<=':
  case 'le':
    return (compare <= 0);
  case '==':
  case '=':
  case 'eq':
    return (compare === 0);
  case '<>':
  case '!=':
  case 'ne':
    return (compare !== 0);
  case '':
  case '<':
  case 'lt':
    return (compare < 0);
  default:
    return null;
  }
}
