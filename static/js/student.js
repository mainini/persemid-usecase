/**
 * @file clientside javascript for student
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
  var graphname = 'http://student.example.org';

  var store = new rdf.SparqlStore({
    endpointUrl: endpointUrl,
    updateUrl: updateUrl
  });

  LD2h.getDataGraph = function (callback) {
    store.graph(graphname, callback);
  };

///// helper functions

  var fillEditForm = function fillEditForm() {
    $('#in-name').val($('#td-name').text());
    $('#in-vorname').val($('#td-vorname').text());
    $('#in-geburtsdatum').val($('#td-geburtsdatum').text());
    $('#in-zivilstand').val($('#td-zivilstand').text());
    $('#in-email').val($('#td-email').text());
    $('#in-webid').val($('#td-webid').text());
    $('#in-matrikelnummer').val($('#td-matrikelnummer').text());
    $('#in-sozialversicherungsnummer').val($('#td-sozialversicherungsnummer').text());
    $('#in-strasse').val($('#td-strasse').text());
    $('#in-plz').val($('#td-plz').text());
    $('#in-ort').val($('#td-ort').text());
    $('#in-nationalitaet').val($('#td-nationalitaet').text());
    $('#in-heimatort').val($('#td-heimatort').text());
    $('#in-wohnortstudba').val($('#td-wohnortstudba').text());
    $('#in-wohnort2jahre').val($('#td-wohnort2jahre').text());
  };

  var saveToStore = function saveToStore() {
    var update = 'BASE <http://example.org/Student>\n' +
      'PREFIX s: <http://persemid.bfh.ch/vocab/student#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { <#> ?p ?s . }\n' +
      'WHERE { <#> ?p ?s . FILTER (?p NOT IN (s:file, s:permission, s:exportFilter)) };' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> a s:Student .\n' +
      '<#> s:name "' + $('#in-name').val() + '" .\n' +
      '<#> s:vorname "' + $('#in-vorname').val() + '" .\n' +
      '<#> s:geburtsdatum "' + $('#in-geburtsdatum').val() + '" .\n' +
      '<#> s:zivilstand "' + $('#in-zivilstand').val() + '" .\n' +
      '<#> s:email "' + $('#in-email').val() + '" .\n' +
      '<#> s:webid "' + $('#in-webid').val() + '" .\n' +
      '<#> s:matrikelnummer "' + $('#in-matrikelnummer').val() + '" .\n' +
      '<#> s:sozialversicherungsnummer "' + $('#in-sozialversicherungsnummer').val() + '" .\n' +
      '<#> s:strasse "' + $('#in-strasse').val() + '" .\n' +
      '<#> s:plz "' + $('#in-plz').val() + '" .\n' +
      '<#> s:ort "' + $('#in-ort').val() + '" .\n' +
      '<#> s:nationalitaet "' + $('#in-nationalitaet').val() + '" .\n' +
      '<#> s:heimatort "' + $('#in-heimatort').val() + '" .\n' +
      '<#> s:wohnortstudba "' + $('#in-wohnortstudba').val() + '" .\n' +
      '<#> s:wohnort2jahre "' + $('#in-wohnort2jahre').val() + '" .\n' +
      ' } }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        document.location.hash = '/studentdata/view';
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  var saveExportFiltersToStore = function saveExportFiltersToStore() {
    var selected = [];
    $('#div-view-dossier input:checkbox:not(:checked)').each(function() {
      selected.push($(this).attr('id'));
    });

    var update = 'BASE <http://example.org/Student>\n' +
      'PREFIX v: <http://persemid.bfh.ch/vocab/student#>\n' +
      'WITH <http://student.example.org>\n' +
      'DELETE { <#> v:exportFilter ?o . }\n' +
      'WHERE { <#> v:exportFilter ?o } ;\n';

    if(selected.length > 0) {
      update += 'WITH <http://student.example.org>\nINSERT { \n';
      selected.forEach(function(filter) {
        update += '  <#> v:exportFilter "' + filter +  '" .\n';
      });
      update += '}\n WHERE { }\n';
    }

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        alert('Export settings saved!');
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  window.getExportFiltersFromStore = function getExportFiltersFromStore() {
    $('#div-view-dossier input:checkbox').prop( 'checked', true);

    $.get('/student/exportfilters').done(function(data) {
      data.exportFilters.forEach(function(filter) {
        $('#' + filter).prop('checked', false);
      });
    })
    .fail(function (e) {
        console.log('Error while getting export filters: ', e);
        alert('Error (see console for details)!');
    });
  };

  var savePermissionsToStore = function savePermissionsToStore() {
    var update = 'BASE <http://example.org/Student>\n' +
      'PREFIX s: <http://persemid.bfh.ch/vocab/student#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { ?s s:permission ?o . }\n' +
      'WHERE { ?s s:permission ?o } ;\n' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> s:permission "' + $('#in-student-webid').val() + '"} }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-student-permissions').addClass('render');
        LD2h.expand();
        $('#in-student-webid').val("");
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  window.deletePermissionsFromStore = function deletePermissionsFromStore() {
    var update = 'BASE <http://example.org/Student>\n' +
      'PREFIX s: <http://persemid.bfh.ch/vocab/student#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { <#> s:permission ?o . }\n' +
      'WHERE { <#> s:permission ?o } ;\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-student-permissions').addClass('render');
        LD2h.expand();
        $('#in-student-webid').val("");
       })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

///// action functions for toplevel navigation

  var showViewStudentData = function showViewStudentData() {
    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-studentdata').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-studentdata').show();

    $('#a-nav-data-edit').removeClass('active');
    $('#a-nav-data-view').addClass('active');
    $('#div-studentdata-edit').hide();
    $('#div-studentdata-view').show();
  };

  var showViewFiles = function showViewFiles() {
    LD2h.expand();
    $('#li-nav-main-studentdata').removeClass('active');
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-files').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-studentdata').show();

    $('#div-views').children().hide();
    $('#div-view-files').show();
  };

  var showViewBscData = function showViewBscData() {
    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-studentdata').removeClass('active');
    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-bscdata').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-bscdata').show();
  };

  var showViewDossier = function showViewDossier() {
    $('#ld2h-dossier-studentdata').addClass('render');
    $('#ld2h-dossier-bscdata').addClass('render');
    $('#ld2h-dossier-files').addClass('render');
    LD2h.expand();

    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-studentdata').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-dossier').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-dossier').show();
  };

  var showViewPermissions = function showViewPermissions() {
    $('#ld2h-student-permissions').addClass('render');
    LD2h.expand();

    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-studentdata').removeClass('active');
    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-permissions').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-student-permissions').show();
  };

  var showViewDecision = function showViewDecision() {
    $('#ld2h-student-decision').addClass('render');
    LD2h.expand();

    $('#li-nav-main-files').removeClass('active');
    $('#li-nav-main-studentdata').removeClass('active');
    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-bscdata').removeClass('active');
    $('#li-nav-main-decision').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-hmsc-decision').show();
  };

///// action functions for studentdata-view

  var showDataView = function showDataView() {
    $('#ld2h-view-studentdata').addClass('render');
    LD2h.expand();

    $('#li-nav-data-edit').removeClass('active');
    $('#li-nav-data-view').addClass('active');
    $('#div-studentdata-edit').hide();
    $('#div-studentdata-view').show();
  };

  var showDataEdit = function showDataEdit() {
    fillEditForm();

    $('#li-nav-data-view').removeClass('active');
    $('#li-nav-data-edit').addClass('active');
    $('#div-studentdata-view').hide();
    $('#div-studentdata-edit').show();
  };

  window.deleteDataHBSC = function deleteDataHBSC() {
    jQuery.get('/student/deletehbsc')
      .done(function () {
        $('#ld2h-view-studentbscdata').addClass('render');
        LD2h.expand();
        document.location.hash =  '/studentdata/view';
      })
      .fail(function (error) {
        console.log('Error on server while deleting!', error);
        alert('Error (see console for details)!');
    });
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
    jQuery.get('/files/delete/student/' + fileHandle)
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

///// events for view: student data

  $('#btn-studentdata-cancel').click(function () {
    document.location.hash =  '/studentdata/view';
    $('#form-student-edit').trigger('reset');
  });

  $('#btn-studentdata-save').click(function () {
    saveToStore();
  });

  $('#a-data-view-refresh').click(function () {
    $('#a-data-view-refresh').blur();
    $('#ld2h-view-studentdata').addClass('render');
    LD2h.expand();
  });

///// events for view: student files

  $('#btn-upload-cancel').click(function () {
    document.location.hash =  '/files/view';
    $('#form-file-upload').trigger('reset');
  });

  $('#a-files-view-refresh').click(function () {
    $('#a-files-view-refresh').blur();
    $('#ld2h-view-files').addClass('render');
    LD2h.expand();
  });

///// events for view: student permissions

  $('#btn-student-permissions-save').click(function () {
    savePermissionsToStore();
 });

///// events for view: student dossier

  $('#a-data-dossier-refresh').click(function () {
    getExportFiltersFromStore();
  });

  $('#btn-dossier-save').click(function () {
    saveExportFiltersToStore();
  });

///// routing

  var routes = {
    '/studentdata/view': [ showViewStudentData, showDataView ],
    '/studentdata/edit': [ showViewStudentData, showDataEdit ],
    '/files/view': [ showViewFiles, showFilesView ],
    '/files/upload': [ showViewFiles, showFilesUpload ],
    '/bscdata': showViewBscData,
    '/dossier': showViewDossier,
    '/permissions': showViewPermissions,
    '/decision': showViewDecision
  };

  var router = new Router(routes);
  router.init();

  if (document.location.hash === '') {
    document.location.hash =  '/studentdata/view';
  }
});
