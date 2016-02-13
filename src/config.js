/**
 * @file Configuration helper for PSIDIMAS
 * @copyright 2015/2016 Pascal Mainini {@link http://mainini.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal@mainini.ch>
 * @version 0.0.1
 *
 * This module manages the configuration of the whole application, providing sane defaults and
 * parsing the configuration file.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var cfg = require('nconf'),
  fs = require('fs'),
  forge = require('node-forge');
var pki = forge.pki;

cfg.argv().env().file({
  file: 'config.json'
});

cfg.defaults({
  'server': {
    'fqdn': 'localhost',
    'port': 8443,
    'root': 'static',
    'cacheTemplates': false,
    'logformat': 'combined',
    'cert': 'certs/server-cert.pem',
    'key': 'certs/server-key.pem',
    'cacert': 'certs/cacert.pem',
    'sessionKeys': ['key1', 'key2']
  },
  'proxy': {
    'target': {
      'host': 'localhost',
      'port': '3030'
    }
  },
  'upload': {
    'dir':'/tmp/psidimas',
    'maxsize': 104857600    // 100 MB
  },
  'rdf': {
    'student': {
      'query_uri': 'http://localhost:3030/persemid/query',
      'update_uri': 'http://localhost:3030/persemid/update',
      'graphstore_uri': 'http://localhost:3030/persemid/data?graph=http://student.example.org',
      'graph':'http://student.example.org',
      'base': 'http://example.org/Student',
      'export_types': '{ ?s a s:Student } UNION { ?s a h:BSCData } .'
    },
    'hbsc': {
      'query_uri': 'http://localhost:3030/persemid/query',
      'update_uri': 'http://localhost:3030/persemid/update',
      'graphstore_uri': 'http://localhost:3030/persemid/data?graph=http://hbsc.example.org',
      'graph':'http://hbsc.example.org',
      'base': 'http://example.org/HBSC',
      'export_types': '?s a h:BSCData .'
    },
    'hmsc': {
      'query_uri': 'http://localhost:3030/persemid/query',
      'update_uri': 'http://localhost:3030/persemid/update',
      'graphstore_uri': 'http://localhost:3030/persemid/data?graph=http://hmsc.example.org',
      'graph':'http://hmsc.example.org',
      'base': 'http://example.org/HMSC'
    }
  },
  'webid': {
    'pem': {
      'student': 'certs/webid-cert-student.pem',
      'hbsc': 'certs/webid-cert-hbsc.pem',
      'hmsc': 'certs/webid-cert-hmsc.pem'
    },
    'uri': {
      'student': 'https://localhost:8443/webid/student#id',
      'hbsc': 'https://localhost:8443/webid/hbsc#id',
      'hmsc': 'https://localhost:8443/webid/hmsc#id'
    },
    'enabled': true
  },
  'debugMode': true
});

// set debugging options
if(cfg.get('debugMode')) {
  cfg.set('server:logformat', 'dev');
}

cfg.set('webid:cert:student', pki.certificateFromPem(fs.readFileSync(cfg.get('webid:pem:student'))));
cfg.set('webid:cert:hbsc', pki.certificateFromPem(fs.readFileSync(cfg.get('webid:pem:hbsc'))));
cfg.set('webid:cert:hmsc', pki.certificateFromPem(fs.readFileSync(cfg.get('webid:pem:hmsc'))));

/***********************************************************
 * Function definitions
 **********************************************************/

/**
 * Retrieves an entry from the configuration. This is simply a proxy to nconf.get()
 *
 * @param   key   Key to fetch the value for
 * @returns The value as returned by nconf.get()
 */
module.exports.get = function get(key) {
  return cfg.get(key);
};
