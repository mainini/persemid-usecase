/**
 * @file clientside javascript for hmsc
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
  var graphname = 'http://hmsc.example.org';

  var store = new rdf.SparqlStore({
    endpointUrl: endpointUrl,
    updateUrl: updateUrl
  });

  LD2h.getDataGraph = function (callback) {
    store.graph(graphname, callback);
  };

///// helper functions

  var saveDecision = function saveDecision() {
    var update = 'BASE <http://example.org/HMSC>\n' +
      'PREFIX m: <http://persemid.bfh.ch/vocab/hmsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { ?s m:decision ?o . }\n' +
      'WHERE { ?s m:decision ?o } ;\n' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> m:decision "' + $('#in-decision').prop('checked') + '"^^<http://www.w3.org/2001/XMLSchema#boolean> } }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        alert('Bescheid gespeichert!');
        document.location.hash = '/decision';
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  var savePermissionsToStore = function savePermissionsToStore() {
    var update = 'BASE <http://example.org/HMSC>\n' +
      'PREFIX m: <http://persemid.bfh.ch/vocab/hmsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { ?s m:permission ?o . }\n' +
      'WHERE { ?s m:permission ?o } ;\n' +
      'INSERT DATA { GRAPH <' + graphname + '> { <#> m:permission "' + $('#in-hmsc-webid').val() + '"} }\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-hmsc-permissions').addClass('render');
        LD2h.expand();
        $('#in-hmsc-webid').val("");
      })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };

  window.deletePermissionsFromStore = function deletePermissionsFromStore() {
    var update = 'BASE <http://example.org/HMSC>\n' +
      'PREFIX m: <http://persemid.bfh.ch/vocab/hmsc#>\n' +
      'WITH <' + graphname + '>\n' +
      'DELETE { <#> m:permission ?o . }\n' +
      'WHERE { <#> m:permission ?o } ;\n';

    jQuery.post(updateUrl, {update: update})
      .done(function () {
        $('#ld2h-hmsc-permissions').addClass('render');
        LD2h.expand();
        $('#in-hmsc-webid').val("");
       })
      .fail(function (e) {
        console.log('Error with query ' + update, e);
        alert('Error (see console for details)!');
    });
  };


///// action functions for toplevel navigation

  var showViewDossier = function showViewDossier() {
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-dossier').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-hmsc-dossier').show();
  };

  var showViewDecision = function showViewDecision() {
    $('#ld2h-decision').addClass('render');
    LD2h.expand();

    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-permissions').removeClass('active');
    $('#li-nav-main-decision').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-hmsc-decision').show();
  };

  var showViewPermissions = function showViewPermissions() {
    $('ld2h-hmsc-permissions').addClass('render');
    LD2h.expand();

    $('#li-nav-main-dossier').removeClass('active');
    $('#li-nav-main-decision').removeClass('active');
    $('#li-nav-main-permissions').addClass('active');
    $('#div-views').children().hide();
    $('#div-view-hmsc-permissions').show();
  };

///// action functions for dossier-view

  var fetchDossier = function fetchDossier() {
    jQuery.get('/hmsc/dossierexists')
      .done(function (data) {
        if (data.dossierExists) {
          $('#ld2h-dossier-studentdata-hmsc').addClass('render');
          $('#ld2h-dossier-bscdata-hmsc').addClass('render');
          $('#ld2h-dossier-files-hmsc').addClass('render');
          LD2h.expand();

          $('#div-dossier-form').hide();
          $('#div-dossier-show').show();
        } else {
          $('#div-dossier-show').hide();
          $('#div-dossier-form').show();
        }
      })
      .fail(function (error) {
        console.log('Error on server while checking for dossier!', error);
        alert('Error (see console for details)!');
    });
  };

  window.deleteDossier = function deleteDossier() {
    jQuery.get('/hmsc/deletedossier')
      .done(function () {
        fetchDossier();
      })
      .fail(function (error) {
        console.log('Error on server while deleting dossier!', error);
        alert('Error (see console for details)!');
    });
  };

///// events for view: dossier

  $('#btn-hmsc-dossier-cancel').click(function () {
    $('#form-dossier-upload').trigger('reset');
  });

  $('#a-hmsc-dossier-refresh').click(function () {
    $('#a-hmsc-dossier-refresh').blur();
    fetchDossier();
  });

///// events for view: decision

  $('#btn-hmsc-dossier-decision').click(saveDecision);

///// events for view: permissions

  $('#btn-hmsc-permissions-save').click(function () {
    savePermissionsToStore();
 });

///// routing

  var routes = {
    '/dossier': [ showViewDossier, fetchDossier],
    '/decision': showViewDecision,
    '/permissions': showViewPermissions
  };

  var router = new Router(routes);
  router.init();

  if (document.location.hash === '') {
    document.location.hash =  '/dossier';
  }
});
