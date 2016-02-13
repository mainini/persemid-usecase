/**
 * @file clientside javascript for hbsc
 * @copyright 2015/2016 Pascal Mainini {@link http://mainini.ch}
 * @license MIT, see included file LICENSE or {@link http://opensource.org/licenses/MIT}
 * @author Pascal Mainini <pascal@mainini.ch>
 * @version 0.0.1
 *
 * This file contains the main server code for PSIDIMAS.
 */

/*jshint jquery:true, browser:true, devel:true, bitwise:true, curly:true, immed:true, indent:2, latedef:true, newcap:true, noarg: true, noempty:true, nonew:true, quotmark:single, undef:true, unused: true, trailing:true, white:false */
/*global rdf:false, LD2h:false, Router:false*/

$('document').ready(function() {

///// initialisation

  var endpointUrl = '/triplestore/persemid/query';
  var updateUrl = '/triplestore/persemid/update';
  var graphname = 'http://hbsc.example.org';

  var store = new rdf.SparqlStore({
    endpointUrl: endpointUrl,
    updateUrl: updateUrl
  });

  LD2h.getDataGraph = function (callback) {
    store.graph(graphname, callback);
  };

///// helper functions

  var fillEditForm = function fillEditForm() {
    $('#in-datebsc').val($('#td-datebsc').text());
    $('#in-studiengang').val($('#td-studiengang').text());
    $('#in-umfang').val($('#td-umfang').text());
  };

  var saveToStore = function saveToStore() {
    var update = 'BASE <http://example.org/HBSC>\n' +
      'PREFIX s: <http://persemid.bfh.ch/vocab/hbsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { <#> ?p ?s . }\n' +
      'WHERE { <#> ?p ?s . FILTER (?p NOT IN (s:file, s:name, s:permission)) };' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> a s:BSCData .\n' +
      '<#> s:datebsc "' + $('#in-datebsc').val() + '" .\n' +
      '<#> s:studiengang "' + $('#in-studiengang').val() + '" .\n' +
      '<#> s:umfang "' + $('#in-umfang').val() + '" .\n' +
      ' } }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        document.location.hash = '/bscdata/view';
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  var savePermissionsToStore = function savePermissionsToStore() {
    var update = 'BASE <http://example.org/HBSC>\n' +
      'PREFIX b: <http://persemid.bfh.ch/vocab/hbsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { ?s b:permission ?o . }\n' +
      'WHERE { ?s b:permission ?o } ;\n' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> b:permission "' + $('#in-hbsc-webid').val() + '"} }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-hbsc-permissions').addClass('render');
        LD2h.expand();
        $('#in-hbsc-webid').val("");
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  window.deletePermissionsFromStore = function deletePermissionsFromStore() {
    var update = 'BASE <http://example.org/HBSC>\n' +
      'PREFIX b: <http://persemid.bfh.ch/vocab/hbsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { <#> b:permission ?o . }\n' +
      'WHERE { <#> b:permission ?o } ;\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-hbsc-permissions').addClass('render');
        LD2h.expand();
        $('#in-hbsc-webid').val("");
       })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };


///// action functions for toplevel navigation

  var showViewBscData = function showViewBscData() {
    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-bscdata').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-bscdata').show();

    $('#a-nav-data-edit').removeClass('active');
    $('#a-nav-data-view').addClass('active');
    $('#div-bscdata-edit').hide();
    $('#div-bscdata-view').show();
  };

  var showViewFiles = function showViewFiles() {
    LD2h.expand();
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-files').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-files').show();

  };

  var showViewPermissions = function showViewPermissions() {
    $('ld2h-hbsc-permissions').addClass('render');
    LD2h.expand();

    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-permissions').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-hbsc-permissions').show();
  };

///// action functions for studentdata-view

  var showDataView = function showDataView() {
    $('#ld2h-view-bscdata').addClass('render');
    LD2h.expand();

    $('#li-nav-data-edit').removeClass('active');
    $('#li-nav-data-view').addClass('active');
    $('#div-bscdata-edit').hide();
    $('#div-bscdata-view').show();
  };

  var showDataEdit = function showDataEdit() {
    fillEditForm();

    $('#li-nav-data-view').removeClass('active');
    $('#li-nav-data-edit').addClass('active');
    $('#div-bscdata-view').hide();
    $('#div-bscdata-edit').show();
  };

///// action functions for files-view

  var showFilesView = function showFilesView() {
    $('#ld2h-view-files').addClass('render');
    LD2h.expand();
    $('#form-file-upload').trigger('reset');

    $('#li-nav-files-upload').removeClass('active');
    $('#li-nav-files-view').addClass('active');
    $('#div-file-form').hide();
    $('#div-file-table').show();
  };

  var showFilesUpload = function showFilesUpload() {
    fillEditForm();

    $('#li-nav-files-view').removeClass('active');
    $('#li-nav-files-upload').addClass('active');
    $('#div-file-table').hide();
    $('#div-file-form').show();
  };

  window.deleteFile = function deleteFile(fileHandle) {
    jQuery.get('/files/delete/hbsc/' + fileHandle)
      .done(function () {
        $('#ld2h-view-files').addClass('render');
        LD2h.expand();
        document.location.hash =  '/files/view';
      })
      .fail(function (error) {
        console.log('Error on server while deleting!', error);
        alert('Error (see console for details)!');
    });
  };

///// events for view: bsc data

  $('#btn-bscdata-cancel').click(function () {
    document.location.hash =  '/bscdata/view';
    $('#form-bscdata-edit').trigger('reset');
  });

  $('#btn-bscdata-save').click(function () {
    saveToStore();
  });

  $('#a-data-view-refresh').click(function () {
    $('#a-data-view-refresh').blur();
    $('#ld2h-view-bscdata').addClass('render');
    LD2h.expand();
  });

///// events for view: bsc files

  $('#btn-upload-cancel').click(function () {
    document.location.hash =  '/files/view';
    $('#form-file-upload').trigger('reset');
  });

  $('#a-files-view-refresh').click(function () {
    $('#a-files-view-refresh').blur();
    $('#ld2h-view-files').addClass('render');
    LD2h.expand();
  });

///// events for view: bsc permissions

  $('#btn-hbsc-permissions-save').click(function () {
    savePermissionsToStore();
 });

///// routing

  var routes = {
    '/bscdata/view': [ showViewBscData, showDataView ],
    '/bscdata/edit': [ showViewBscData, showDataEdit ],
    '/files/view': [ showViewFiles, showFilesView ],
    '/files/upload': [ showViewFiles, showFilesUpload ],
    '/permissions': showViewPermissions
  };

  var router = new Router(routes);
  router.init();

  if (document.location.hash === '') {
    document.location.hash =  '/bscdata/view';
  }
});
