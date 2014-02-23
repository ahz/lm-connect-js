module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        typescript: {
            base: {
                src: ['Client.ts'],
                dest: './dist',
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    sourcemap: true,
                    declaration: false
                }
            },
            tests: {
                src: ['Client.ts', 'test/*.ts'],
                options: {
                    module: 'commonjs',
                    target: 'es5',
                    sourcemap: true,
                    declaration: false
                }
            }
        },
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: ['src/**/*.js'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
            },
            dist: {
                files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
            }
        },
        qunit: {
            files: ['test/**/*.html']
        },
        jshint: {
            files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true
                }
            }
        },
        watch: {
            files: ['<%= typescript.base.src %>'],
            tasks: ['typescript']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-typescript');

    // grunt.loadNpmTasks('grunt-contrib-uglify');
    // grunt.loadNpmTasks('grunt-contrib-jshint');
    // grunt.loadNpmTasks('grunt-contrib-qunit');
    // grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('test', ['typescript:tests']);
    grunt.registerTask('default', ['typescript:base']);
};