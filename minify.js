#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var util = require('util');


var OUTPUT = path.join(__dirname, 'output');
var DIST = path.join(__dirname, 'dist');


fs.readdir( OUTPUT, function( err, files ) {
    if( err ) {
        console.error( "Could not list the directory.", err );
        process.exit( 1 );
    }

    files.forEach( function( file, index ) {
        // Make one pass and make the file complete
        var fp = path.join( OUTPUT, file );

        fs.stat( fp, function( error, stat ) {
            if( error ) {
                console.error( "Error stating file.", error );
                return;
            }

            if( stat.isFile() && fp.split('.').pop() == 'json' ) {
                var json = JSON.parse(fs.readFileSync(fp));
                recursiveDelete(json, '!url');
                recursiveDelete(json, '!doc');
                var out = path.join(DIST, file);
                fs.writeFile(out, JSON.stringify(json, null, 0));
            }
        } );
    } );
} );

function recursiveDelete(obj, prop, maxLen) {
    if (!maxLen || (obj[prop] && obj[prop].length > maxLen)) {
        delete obj[prop];
    }
    var keys = Object.keys(obj);
    for (var ii = 0; ii < keys.length; ++ii) {
        if (typeof obj[keys[ii]] == 'object') {
            recursiveDelete(obj[keys[ii]], prop, maxLen);
        }
    }
}
