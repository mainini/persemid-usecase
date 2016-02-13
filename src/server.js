/**
 * @file connect-based node.js-server for PSIDIMAS
 * @copyright 2015/2016 Pascal Mainini {@link http://mainini.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal@mainini.ch>
 * @version 0.0.1
 *
 * This file contains the main server code for PSIDIMAS.
 */

/*jshint node:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */

/***********************************************************
 * Initialisation
 **********************************************************/

'use strict';

var https = require('https'),
  fs = require('fs'),
  connect = require('connect'),
  render = require('connect-render'),
  morgan = require('morgan'),
  serveStatic = require('serve-static'),
  httpProxy = require('http-proxy'),
  formidable = require('formidable'),
  request = require('request'),
  crypto = require('crypto'),
  path = require('path'),
  async = require('async'),
  cfg = require('./config.js'),
  cookieSession = require('cookie-session'),
  rdf = require('rdf-ext')();


/***********************************************************
 * Triplestore interaction
 **********************************************************/

/**
 * Adds file-metadata to the triplestore.
 *
 * @param user      To which triplestore do we add?
 * @param file      File-metadata to add
 * @param callback  Callback-function for success/error-callback
 */
var _addFileToTripleStore = function _addFileToTripleStore(user, file, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var fileUri = '<#' + file.handle + '>';
  var statement = 'BASE <' + rdfcfg.base + '>\n' +
    'PREFIX v: <http://persemid.bfh.ch/vocab/' + user + '#>\n' +
    'INSERT DATA\n' +
    '{ GRAPH <'+ rdfcfg.graph + '> {\n' +
    '  <#> v:file ' + fileUri + ' .\n' +
    fileUri + ' v:fileHandle "' + file.handle + '" ;\n' +
    ' v:fileName "' + file.name + '" ;\n' +
    ' v:fileExtension "' + file.extension + '" ;\n' +
    ' v:fileType "' + file.type + '" ;\n' +
    ' v:fileSize ' + file.size + ' ;\n' +
    ' v:fileServerPath "' + file.path + '" .\n' +
    '} }';

  request.post(rdfcfg.update_uri, {form:{update: statement}}, callback);
};

/**
 * Gets all files for a given user from the triplestore.
 *
 * @param user      For which user to retrieve the files
 * @param callback  Callback-function for returning the files or possible errors
 */
var _getFilesFromTripleStore = function _getFilesFromTripleStore(user, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      var paths = [];
      graph.match(rdfcfg.base + '#', 'http://persemid.bfh.ch/vocab/' + user + '#file', null).forEach(function(file) {
          paths.push({
            'handle': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileHandle', null).toArray()[0].object.toString(),
            'name': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileName', null).toArray()[0].object.toString(),
            'extension': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileExtension', null).toArray()[0].object.toString(),
            'type': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileType', null).toArray()[0].object.toString(),
            'size': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileSize', null).toArray()[0].object.toString(),
            'serverPath': graph.match(file.object, 'http://persemid.bfh.ch/vocab/' + user + '#fileServerPath', null).toArray()[0].object.toString()
          });
        });
      callback(paths);
    }
  });
};

/**
 * Gets metadata for a specific file from the triplestore.
 * @param user        For which user to retrieve the metadata
 * @param fileHandle  Handle of the file for which to retrieve the data
 * @param callback    Callback-function for returning the data or possible errors
 */
var _getFileFromTripleStore = function _getFileFromTripleStore(user, fileHandle, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      var subject = rdfcfg.base + '#' + fileHandle;
      var file = {
        'handle': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileHandle', null).toArray()[0].object.toString(),
        'name': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileName', null).toArray()[0].object.toString(),
        'extension': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileExtension', null).toArray()[0].object.toString(),
        'type': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileType', null).toArray()[0].object.toString(),
        'size': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileSize', null).toArray()[0].object.toString(),
        'serverPath': graph.match(subject, 'http://persemid.bfh.ch/vocab/' + user + '#fileServerPath', null).toArray()[0].object.toString()
      };
      callback(file);
    }
  });
};


/**
 * Fetches the path on the filesystem for a given file from the triplestore.
 *
 * @param user        The user for which to return the path
 * @param fileHandle  Handle of the file for which to retrieve the path
 * @param callback    Callback-function for returning the path or possible errors
 */
var _getFilePathFromTripleStore = function _getFilePathFromTripleStore(user, fileHandle, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      var m = graph.match(rdfcfg.base + '#' + fileHandle, 'http://persemid.bfh.ch/vocab/' + user + '#fileServerPath', null);
        callback(m.toArray()[0].object.toString(), null);
    }
  });
};

/**
 * Deletes a file in the triplestore
 *
 * @param user        The user for which to delete the file
 * @param fileHandle  Handle of the file to delete
 * @param callback    Callback-function for reporting success or errors
 */
var _deleteFileFromTripleStore = function _deleteFileFromTripleStore(user, fileHandle, callback) {
  var rdfcfg = cfg.get('rdf:' + user);
  var statement = 'BASE <' + rdfcfg.base + '>\n' +
    'PREFIX v: <http://persemid.bfh.ch/vocab/' + user + '#>\n' +
    'DELETE WHERE { GRAPH <' + rdfcfg.graph +'> {\n' +
    '?subject v:file <#' + fileHandle + '>\n' +
    '} } ;\n' +
    'DELETE WHERE { GRAPH <' + rdfcfg.graph +'> {\n' +
    '<#' + fileHandle + '> ?p ?o\n' +
    '} }\n';

  request.post(rdfcfg.update_uri, {form:{update: statement}}, callback);
};

/**
 * Delete all files in the triplestore of the given user
 *
 * @param user      The user for which to delete all file-metadata
 * @param callback  Callback-function for reporting success or possible errors
 */
var _deleteAllFilesFromTripleStore = function _deleteAllFilesFromTripleStore(user, callback) {
  _getFilesFromTripleStore(user, function(files, error) {
    if(error) {
      callback(null, error);
    } else {
      async.each(files, function(file, callback) {
          _deleteFileFromTripleStore(user, file.handle, callback);
        }, function(error) {
          if(error) {
            callback(null, error);
          } else {
            callback(files, null);
          }
        }
      );
    }
  });
};

/**
 * Export all triples from the triplestore, except those related to user-specific file-settings
 * and additionally filtered ones
 *
 * @param user        The user of which to export all triples
 * @param filters     A list of additional triples to filter
 * @param callback    Callback-function for returning the triples or possible errors
 */
var _exportTriples = function _exportTriples(user, filters, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var filterstr = 'FILTER(!(?p IN (v:exportFilter)))\n' +
    'FILTER(!(?p IN (v:fileServerPath)))\n' +
    'FILTER(!(?p IN (v:file)))\n';
  if(filters !== null) {
    filters.forEach(function(f) {
      filterstr += 'FILTER(!(?p IN (s:' + f + ')))\n';
      filterstr += 'FILTER(!(?p IN (h:' + f + ')))\n';
    });
  }

  var statement = 'BASE <' + rdfcfg.base + '>\n' +
    'PREFIX v: <http://persemid.bfh.ch/vocab/' + user + '#>\n' +
    'PREFIX s: <http://persemid.bfh.ch/vocab/student#>\n' +
    'PREFIX h: <http://persemid.bfh.ch/vocab/hbsc#>\n' +
    'CONSTRUCT { ?s ?p ?o }\n' +
    'WHERE { GRAPH <' + rdfcfg.graph +'> {\n' +
    rdfcfg.export_types + '\n' +
    '?s ?p ?o\n' +
    filterstr +
    '} }\n';

  request.post({ url: rdfcfg.query_uri,
    headers: { 'Accept': 'application/n-triples' },
    form:{query: statement}}, function(error, response, body) {
    if(error) {
      console.log('Error while CONSTRUCT-query: ' +  error);
      callback(null, null, error);
    } else {
      body += '<' + rdfcfg.base + '#>' + ' <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://persemid.bfh.ch/vocab/' + user + '#Export> .';
      callback(body, rdfcfg.base);
    }
  });
};

/**
 * "Posts" triples to the triplestore for importing them.
 *
 * @param user        To which user's triplestore do we post?
 * @param triples     The triples to post
 * @param metadata    Metadata used for additional parametrisation
 * @param callback    Callback-function to return success or possible errors
 */
var _postTriples = function _postTriples(user, triples, metadata, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  triples += '\n<' + rdfcfg.base + '#> <http://persemid.bfh.ch/vocab/' + user + '#import_' + metadata.export_type + '> <' + metadata.root_node + '#> .\n';

  var formData = {
    'files': {
      value: triples,
      options: {
        filename: 'data.nt',
        contentType: 'application/octet-stream',
        knownLength: triples.length
      }
    }
  };

  request.post({url:rdfcfg.graphstore_uri, formData: formData}, function(err) {
    callback(err);
  });
};

/**
 * Delete imported triples from HBsc from student's triplestore
 *
 * @param callback    Callback-function to return success or possible errors
 */
var _studentDeleteHBSC = function _studentDeleteHBSC(callback) {
  var rdfcfg = cfg.get('rdf:student');
  var statement = 'DELETE WHERE { GRAPH <' + rdfcfg.graph + '> {\n' +
    '?s <http://persemid.bfh.ch/vocab/student#import_hbsc> ?o .\n' +
    '?o ?p ?o2\n' +
    '} }\n';

  request.post(rdfcfg.update_uri, {form:{update: statement}}, callback);
};

/**
 * Fetch the configured export-filters from the triplestore
 *
 * @param user      The triplestore of which user do we query?
 * @param callback  Callback-function to return the filters or possible errors
 */
var _getExportFilters = function _getExportFilters(user, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      var filters = [];
      var results = graph.match(null, 'http://persemid.bfh.ch/vocab/' + user + '#exportFilter', null).toArray();

      for(var i = 0; i < results.length; i++) {
        filters.push(results[i].object.toString());
      }

      callback(filters, null);
    }
  });
};

/**
 * Checks if a dossier has been added to HMsc's triplestore
 *
 * @param callback    Callback-function to call for result or possible errors
 */
var _isDossierInTripleStore = function _isDossierInTripleStore(callback) {
  var rdfcfg = cfg.get('rdf:hmsc');

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      if(graph.match(null, 'http://persemid.bfh.ch/vocab/hmsc#import_student', null).toArray().length > 0) {
        callback(true, null);
      } else {
        callback(false, null);
      }
    }
  });
};

/**
 * Delete a student's dossier from HMsc's triplestore
 *
 * @param callback    Callback-function for reporting success or possible errors
 */
var _deleteDossierFromTripleStore = function _deleteDossierFromTripleStore(callback) {
  var rdfcfg = cfg.get('rdf:hmsc');

  // DELETEing by subject is a bit ugly but works for our case
  var statement = 'PREFIX m: <http://persemid.bfh.ch/vocab/hmsc#>\n' +
    'DELETE WHERE { GRAPH <' + rdfcfg.graph + '> {\n' +
    '  <http://example.org/Student#> ?p ?o\n' +
    '} } ;\n' +
    'DELETE WHERE { GRAPH <' + rdfcfg.graph + '> {\n' +
    '  <http://example.org/HBSC#> ?p ?o\n' +
    '} } ;\n' +
    'DELETE WHERE { GRAPH <' + rdfcfg.graph + '> {\n' +
    '  ?s m:import_student ?o\n' +
    '} } ;\n';

  request.post(rdfcfg.update_uri, {form:{update: statement}}, callback);
};

/**
 * Export the triples containing HMsc's immatriculation-decision
 *
 * @param callback    Callback-function for returning the triples or possible errors
 */
var _exportDecisionTriples = function _exportDecisionTriples(callback) {
  var rdfcfg = cfg.get('rdf:hmsc');

  var statement = 'PREFIX m: <http://persemid.bfh.ch/vocab/hmsc#>\n' +
    'CONSTRUCT { <' + rdfcfg.base + '#> a m:HMSC ;\n' +
    '  m:decision ?decision . }\n' +
    'WHERE { GRAPH <' + rdfcfg.graph + '> {\n' +
    '  ?s m:decision ?decision\n' +
    ' } }\n';

  request.post({ url: rdfcfg.query_uri,
    headers: { 'Accept': 'application/n-triples' },
    form:{query: statement}}, function(error, response, body) {
    if(error) {
      console.log('Error while CONSTRUCT-query: ' +  error);
      callback(null, null, error);
    } else {
      callback(body, rdfcfg.base);
    }
  });
};

/**
 * Obtain the set export-permission ("Berechtigungsobjekte") from the triplestore
 *
 * @param user      User for which to obtain the permissions
 * @param callback  Callback-function for returning the permissions or possible errors
 */
var _getExportPermissionFromTripleStore = function _getExportPermissionFromTripleStore(user, callback) {
  var rdfcfg = cfg.get('rdf:' + user);

  var store = new rdf.SparqlStore({
    endpointUrl: rdfcfg.query_uri,
    updateUrl: rdfcfg.update_uri
  });

  store.graph(rdfcfg.graph, function(graph, error) {
    if(error) {
      callback(null, error);
    } else {
      var matches = graph.match(rdfcfg.base + '#', 'http://persemid.bfh.ch/vocab/' + user + '#permission', null).toArray();
      if(matches.length > 0) {
        callback(matches[0].object.toString());
      } else {
        callback(null);
      }
    }
  });
};

/***********************************************************
 * Request handlers
 **********************************************************/

/**
 * Handles upload-requests for all users
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _handleUpload = function _handleUpload(req, res) {
  var user = req.url.match(/(student|hbsc|hmsc).*/)[0];

  if(req.method.toLowerCase() != 'post') {
    res.writeHead(303, { 'Location': '/home' });
    res.end();
  } else {
    var uploadPath = cfg.get('upload:dir') + '/' + user;

    var form = new formidable.IncomingForm();
    form.uploadDir = uploadPath;
    form.keepExtensions = true;
    form.maxFieldsSize = cfg.get('upload:maxsize');
    form.on ('fileBegin', function(name, file) {
      var rand = '';
      var buf = crypto.randomBytes(16);
      for (var i = 0; i < buf.length; ++i) {
        rand += ('0' + buf[i].toString(16)).slice(-2);
      }
      var extension = path.extname(file.name);
      file.path = form.uploadDir + '/' + rand + extension;
      file.handle = rand;
      file.extension = extension;
    });

    form.parse(req, function(err, fields, files) {
      _addFileToTripleStore(user, files.upload, function (error, response) {
        if (!error && response.statusCode == 200) {
          res.writeHead(303, { 'Location': '/' + user + '#/files/view' });
          res.end();
        } else {
          res.statusCode = 500;
          res.end();
        }
      });
    });
  }
};

/**
 * Handles downloads of files stored through the documents-interface.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _handleDownload = function _handleDownload(req, res) {
  var m = req.url.match(/(student|hbsc|hmsc)\/(.*)/);

  _getFileFromTripleStore(m[1], m[2], function (file, error) {
    if(error) {
      console.log('Error while retrieving path of file to send: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      fs.readFile(file.serverPath, function(error, data) {
        if(error) {
          console.log('Error while retrieving path of file to send: ' +  error);
          res.statusCode = 500;
          res.end();
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Length', file.size);
          res.setHeader('Content-Type', file.type);
          res.setHeader('Content-Disposition', 'attachment; filename=' + file.name);   // not sure if this is really standards-compliant...
          res.end(data);
        }
      });
    }
  });
};

/**
 * Deletes a file from filesystem and triplestore.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _handleDelete = function _handleDelete(req, res) {
  var m = req.url.match(/(student|hbsc|hmsc)\/(.*)/);

  _getFilePathFromTripleStore(m[1], m[2], function (path, error) {
    if(error) {
      console.log('Error while retrieving path of file to delete: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      fs.unlink(path, function(error) {
        if(error) {
          console.log('Error while unlinking file: ' +  error);
          res.statusCode = 500;
          res.end();
        } else {
          _deleteFileFromTripleStore(m[1], m[2], function (error) {
            if(error) {
              console.log('Error while deleting file in triplestore: ' +  error);
              res.statusCode = 500;
              res.end();
            } else {
              res.statusCode = 200;
              res.end();
            }
          });
        }
      });
    }
  });
};

/**
 * Handles deleting of HBsc-data imported by the student
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _deleteHBSC = function _deleteHBSC(req, res) {
  _studentDeleteHBSC(function(error) {
    if(error) {
      console.log('Error while deleting students HBSC-data: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      res.statusCode = 200;
      res.end();
    }
   });
};

/**
 * Returns the filters set for export by the student.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _exportFilters = function _exportFilters(req,res) {
  _getExportFilters('student', function(filters, error) {
    if (error) {
      console.log('Error while getting export-filters: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      res.end(JSON.stringify({ exportFilters: filters }));
    }
  });
};

/**
 * Helper-handler to check if a dossier has been added or not.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _dossierExists = function _dossierExists(req,res) {
  _isDossierInTripleStore(function(answer, error) {
    if (error) {
      console.log('Error while checking for dossier in triplestore: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=UTF-8');
      res.end(JSON.stringify({ dossierExists: answer }));
    }
  });
};

/**
 * Deletes an imported dossier and it's file-metadata from the triplestore.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _deleteDossier = function _deleteDossier(req,res) {
  _deleteDossierFromTripleStore(function(error) {
    if (error) {
      console.log('Error deleting dossier in triplestore: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      _deleteAllFilesFromTripleStore('hmsc', function(deletedFiles, error) {
        if (error) {
          console.log('Error deleting files in triplestore: ' +  error);
          res.statusCode = 500;
          res.end();
        } else {
          if (deletedFiles.length > 0) {
            async.each(deletedFiles, function(file, callback) {
                fs.unlink(file.serverPath, callback);
              }, function(error) {
                console.log('Error while unlinking file: ' +  error);
                res.statusCode = 500;
                res.end();
              }
            );
          }

          res.statusCode = 200;
          res.end();
        }
      });
    }
  });
};

/**
 * Handles import of PSIDIMAS-zip-files
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _handleImport = function _handleImport(req, res) {
  var user = req.url.match(/(student|hbsc|hmsc).*/)[0];

  if(req.method.toLowerCase() != 'post') {
    res.writeHead(303, { 'Location': '/home' });
    res.end();
  } else {
    var form = new formidable.IncomingForm();
    form.uploadDir = cfg.get('upload:dir') + '/' + user;
    form.maxFieldsSize = cfg.get('upload:maxsize');

    form.parse(req, function(error, fields, files) {
      if (error) {
        console.log('Error receiving import: ' +  error);
        res.statusCode = 500;
        res.end();
      } else {
        // open received data as zip
        var zip = new require('node-zip')(fs.readFileSync(files.upload.path), {base64: false, checkCRC32: true});
        var metadata =  JSON.parse(zip.file('psidimas/psidimas.json').asText());
        var triples =  zip.file('psidimas/data.nt').asText();

        // add the triples to the triplestore
        _postTriples(user, triples, metadata, function(error) {
          if(error) {
            console.log('Error posting triples: ' +  error);
            res.statusCode = 500;
            res.end();
          } else {
            if(metadata.files) {
              for(var i = 0; i < metadata.files.length; i++) {
                var filemeta = metadata.files[i];
                filemeta.path = cfg.get('upload:dir') + '/' + user + '/' + filemeta.handle + filemeta.extension;

                fs.writeFileSync(filemeta.path, zip.file('psidimas/files/' + filemeta.handle).asNodeBuffer());

                _addFileToTripleStore(user, filemeta, function (error, response, body) {
                  if (error) {
                    console.log('Error adding files to triplestore: ' +  error);
                    fs.unlink(files.upload.path, function(error) {
                      if (error) {
                        console.log('Error unlinking file: ' +  error);
                        res.statusCode = 500;
                        res.write(body);
                        res.end();
                      }
                    });
                    res.statusCode = 500;
                    res.end();
                  }
                });
              }
            }

            fs.unlink(files.upload.path, function(error) {
              if (error) {
                console.log('Error unlinking file: ' +  error);
                res.statusCode = 500;
                res.end();
              } else {
                if (metadata.export_type === 'hmsc') {
                  res.writeHead(303, { 'Location': '/student#/decision' });
                } else {
                  res.writeHead(303, { 'Location': '/' + user.toLowerCase() });
                }
                res.end();
              }
            });
          }
        });
      }
    });
  }
};

/**
 * Handles export to PSIDIMAS-zip-files for student and HBsc
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 * @param user    The user for which to export
 */
var _handleExport = function _handleExport(req, res, user) {
  _getExportFilters(user, function(filters, error) {
    if (error) {
      console.log('Error while getting export-filters: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      _exportTriples(user, filters, function (triples, root, error) {
        if(error) {
          console.log('Error while exporting triples: ' + error);
          res.statusCode = 500;
          res.end();
        } else {
          _getFilesFromTripleStore(user, function(files, error) {
            if(error) {
              console.log('Error posting triples: ' +  error);
              res.statusCode = 500;
              res.end();
            } else {

              var zip = new require('node-zip')();
              zip.file('psidimas/data.nt', triples);

              var exportedFiles = [];
              files.forEach(function(file) {
                if(filters.indexOf('file_' + file.handle) < 0) {
                  zip.file('psidimas/files/' + file.handle, fs.readFileSync(file.serverPath));
                  delete(file.serverPath);
                  exportedFiles.push(file);
                }
              });

              var metadata = {
                export_type: user,
                root_node: root,
                files: exportedFiles
              };

              zip.file('psidimas/psidimas.json', JSON.stringify(metadata));

              var data = zip.generate({base64:false, compression:'DEFLATE'});
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Length', data.length);
              res.setHeader('Content-Disposition', 'attachment; filename=export-' + user + '.zip');   // not sure if this is really standards-compliant...
              res.end(data, 'binary');
            }
          });
        }
      });
    }
  });
};

/**
 * Handles export to PSIDIMAS-zip-files for HMsc
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _handleExportHMSC = function _handleExportHMSC(req, res) {
  _exportDecisionTriples(function (triples, root, error) {
    if(error) {
      console.log('Error while exporting decision triples: ' + error);
      res.statusCode = 500;
      res.end();
    } else {
      var zip = new require('node-zip')();
      zip.file('psidimas/data.nt', triples);

      var metadata = {
        export_type: 'hmsc',
        root_node: root
      };
      zip.file('psidimas/psidimas.json', JSON.stringify(metadata));

      var data = zip.generate({base64:false, compression:'DEFLATE'});
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', data.length);
      res.setHeader('Content-Disposition', 'attachment; filename=export-hmsc.zip');   // not sure if this is really standards-compliant...
      res.end(data, 'binary');
    }
  });
};

/**
 * Creates and returns a WebID-profile-document by reading out the according certificate
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 */
var _getWebIDProfile = function _getWebIDProfile(req, res) {
  var cert = cfg.get('webid:cert:'+ req.url.match(/(student|hbsc|hmsc).*/)[0]);

  var profile = '@prefix cert: <http://www.w3.org/ns/auth/cert#> .\n' +
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n' +
    '@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n' +
    '@prefix rdfs: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n\n' +
    '<#id> a foaf:Person;\n' +
    '  cert:key [ a cert:RSAPublicKey;\n' +
    '  cert:modulus "' + cert.publicKey.n.toString(16) + '"^^xsd:hexBinary;\n' +
    '  cert:exponent ' + cert.publicKey.e.toString() + ' ;\n' +
    '] .';

  res.statusCode = 200;
  if (req.headers.accept.match(/^text\/html/)) {
    res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  } else {
    res.setHeader('Content-Type', 'text/turtle; charset=UTF-8');
  }
  res.end(profile);
};

/**
 * Tries to fetch the client-certificate used in the connection and to match it against the WebID-profile-document.
 * Adds the WebID-URI to the session if valid.
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 * @param next    Next handler-function to call
 */
var _authenticate = function _authenticate(req, res, next) {
  if (req.session.webid) {
    next();
  } else {
    var cert = req.connection.getPeerCertificate();
    if (cert.modulus) {
      var modulus = cert.modulus.toLowerCase();
      var exponent = parseInt(cert.exponent, 16).toString().toLowerCase();
      var webid = cert.subjectaltname.match(/URI:([^, ]+)/)[1];

      request.get({ url: webid, headers: { 'Accept': 'text/turtle' }}, function(error, response, profile) {
        if(error) {
          console.log('Error while retrieving WebID! ' +  error);
          res.statusCode = 500;
          res.end();
        } else {
          profile = profile.toLowerCase();

          // TODO Ugly - should use rdf-ext but was not able to integrate due to rdf-ext-version-change during development
          if(exponent === profile.match(/cert:exponent ([0-9]+)/)[1] && modulus === profile.match(/cert:modulus "([0-9a-zA-Z]+)"/)[1]) {
            console.log('Successfully verified WebID!');
            req.session.webid = webid;
            next();
          } else {
            console.log('WebID does not match!');
            res.statusCode = 401;
            res.end('WebID und Profil stimmen nicht ueberein!');
           }
        }
      });
    } else {
      next();
    }
  }
};

/**
 * Helper to check authorization prior to exporting
 *
 * @param req     The incomming request-object
 * @param res     The outgoing response-object
 * @param user
 */
var _authorizedExport = function _authorizedExport(req, res, user) {
  _getExportPermissionFromTripleStore(user, function(permission, error) {
    if (error) {
      console.log('Error retrieving export permission: ' +  error);
      res.statusCode = 500;
      res.end();
    } else {
      if (cfg.get('webid:enabled') && !permission) {
          res.statusCode = 401;
          res.end('Zugriff nicht freigegeben!');
      } else {
        if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === permission)) {
          if (user === 'hmsc') {
            _handleExportHMSC(req, res);
          } else {
            _handleExport(req, res, user);
          }
        } else {
          res.statusCode = 401;
          res.end('Zugriff nur mit WebID <' + permission + '>!');
        }
      }
    }
  });
};

/***********************************************************
 * Main code
 **********************************************************/

///// Set up  stuff

var cacert = fs.readFileSync(cfg.get('server:cacert'));
https.globalAgent.options.ca = cacert;      // override default ca-certs so that request used by webid can fetch the profile...

var proxy = httpProxy.createProxyServer(cfg.get('proxy'));

var webserver = connect();
webserver.use(morgan(cfg.get('server:logformat')));
webserver.use(render({ root: './views', layout: false, cache: cfg.get('server:cacheTemplates')}));

///// Server for WebID-profiles

webserver.use('/webid', _getWebIDProfile);

////////// Everything after this point is authenticated via WebID

if (cfg.get('webid:enabled')) {
  webserver.use(cookieSession({ 'name': 'session', 'keys': cfg.get('server:sessionKeys')}));
  webserver.use('/', _authenticate);
}

///// Handle zip-exports

webserver.use('/student/export', function(req, res) {
  _authorizedExport(req, res, 'student');
});

webserver.use('/hbsc/export', function(req, res) {
  _authorizedExport(req, res, 'hbsc');
});

webserver.use('/hmsc/export', function(req, res) {
  _authorizedExport(req, res, 'hmsc');
});

///// Other frontend actions

webserver.use('/student/deletehbsc', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:student'))) {
    _deleteHBSC(req,res);
  } else {
    res.statusCode = 401;
    res.end('Benoetigt Student-WebID fuer Zugriff!');
  }
});

webserver.use('/student/exportfilters', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:student'))) {
    _exportFilters(req,res);
  } else {
    res.statusCode = 401;
    res.end('Benoetigt Student-WebID fuer Zugriff!');
  }
});

webserver.use('/hmsc/dossierexists', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:hmsc'))) {
    _dossierExists(req,res);
  } else {
    res.statusCode = 401;
    res.end('Benoetigt HMsc-WebID fuer Zugriff!');
  }
});

webserver.use('/hmsc/deletedossier', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:hmsc'))) {
    _deleteDossier(req,res);
  } else {
    res.statusCode = 401;
    res.end('Benoetigt HMsc-WebID fuer Zugriff!');
  }
});

///// Handle fileuploads and deletions

// TODO authorisation
webserver.use('/files/upload', _handleUpload);
webserver.use('/files/download', _handleDownload);
webserver.use('/files/delete', _handleDelete);
webserver.use('/import', _handleImport);

///// Render templates

webserver.use('/home', function(req, res) {
  res.render('home/index.html', { url: req.url });
});

webserver.use('/student', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:student'))) {
    res.render('student/index.html', { url: req.url });
  } else {
    res.statusCode = 401;
    res.end('Benoetigt Student-WebID fuer Zugriff!');
  }
});

webserver.use('/hbsc', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:hbsc'))) {
    res.render('hbsc/index.html', { url: req.url });
  } else {
    res.statusCode = 401;
    res.end('Benoetigt HBsc-WebID fuer Zugriff!');
  }
});

webserver.use('/hmsc', function(req, res) {
  if (!cfg.get('webid:enabled') || (req.session.webid && req.session.webid === cfg.get('webid:uri:hmsc'))) {
    res.render('hmsc/index.html', { url: req.url });
  } else {
    res.statusCode = 401;
    res.end('Benoetigt HMsc-WebID fuer Zugriff!');
  }
});

///// Serve static content

webserver.use('/', serveStatic(cfg.get('server:root')));

///// Proxy /triplestore

webserver.use('/triplestore', function(req, res) {
    if (cfg.get('debugMode')) {
      console.log(req.headers);
    }
    proxy.web(req, res);
  }
);

///// Redirect everything else to /home...

webserver.use('/', function(req,res) {
  res.writeHead(301, { 'Location': '/home' });
  res.end();
});

///// Start server

var serverOptions = {
  key: fs.readFileSync(cfg.get('server:key')),
  cert: fs.readFileSync(cfg.get('server:cert')),
  ca: cacert,
  requestCert: true,
  rejectUnauthorized: false
};

https.createServer(serverOptions, webserver).listen(cfg.get('server:port'));
