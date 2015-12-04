var sf = require('jsforce');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var url = require('url') ;
var pg = require('pg');
var dbOperations = require("./database/database.js");

var conn;
var attIds;
var accesToken;
var refreshToken;
var instanceUrl;

app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var oauth2 = new sf.OAuth2({
    // we can change loginUrl to connect to sandbox or prerelease env.
    // loginUrl : 'https://test.salesforce.com',
    clientId : '3MVG91ftikjGaMd_epnylI.6EF7HD13f4Vz5k27V.mtepNErOxzFVdczAIGPkckY57Uy5V9EK5UohtiJM00t7',
    clientSecret : '4671395917099215169',
    redirectUri : 'https://salesforceapi.herokuapp.com/callback'
});

// var conn = new jsforce.Connection({
//     oauth2 : {
//         clientId : '<your Salesforce OAuth2 client ID is here>',
//         clientSecret : '<your Salesforce OAuth2 client secret is here>',
//         redirectUri : '<your Salesforce OAuth2 redirect URI is here>'
//     },
//         instanceUrl : '<your Salesforce server URL (e.g. https://na1.salesforce.com) is here>',
//         accessToken : '<your Salesforrce OAuth2 access token is here>',
//         refreshToken : '<your Salesforce OAuth2 refresh token is here>'
//     });
//     conn.on("refresh", function(accessToken, res) {
//         // Refresh event will be fired when renewed access token
//         // to store it in your storage for next request
//     });

// Get authz url and redirect to it.
app.get('/', function(req, res) {
    console.log('---------------------- estoy adentro de la autorizacion');
    res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/callback', function(req, res) {
    var conn = new sf.Connection({ oauth2 : oauth2 });
    var code = req.query.code;

    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }

        console.log('Access Token: ' + conn.accessToken);
        console.log('Instance URL: ' + conn.instanceUrl);
        console.log('User ID: ' + userInfo.id);
        console.log('Org ID: ' + userInfo.organizationId);
        
        var aT = encodeURIComponent(conn.accessToken);
        var iUrl = encodeURIComponent(conn.instanceUrl);
        var rT = encodeURIComponent(conn.refreshToken);

        var url = '/db/addRecord?aT=' + aT + '&iUrl=' + iUrl + '&rT=' + rT;
        console.log('**************getrecords ', dbOperations.getRecords(req,res));
        // console.log('2', Object.keys(dbOperations.getRecords(req,res)).length);
        if ( false ) {
            res.redirect(url);
        } else {
            res.redirect('/accounts');
        }
    });
});

// var records = [];
// conn.query("SELECT Id, Name FROM Account", function(err, result) {
//     if (!err) {
//         console.log("total : " + result.totalSize);
//         console.log("fetched : " + result.records.length);
//     }
// });

app.get('/accounts', function(req, res) {
    var test = res.redirect('/db/readRecords');
    console.log('acces token', test.accessToken);

    // if auth has not been set, redirect to index
    // if (accessToken == null || instanceUrl == null) { res.redirect('/'); }

    var query = "SELECT Id, Name FROM Account";
    // open connection with client's stored OAuth details
    var conn = new jsforce.Connection({
        accessToken: req.session.accesToken,
        instanceUrl: req.session.instanceUrl
    });

    conn.query(query, function(err, result) {
        if (err) {
            console.error('error-----', err);
            res.redirect('/');
        }
        console.log('resultado de query ', result);
        //res.render('accounts', {title: 'Accounts List', accounts: result.records});
    });
});

app.post('/test', function(req, res) {
    var message = 'ERROR';
    attIds = req.body;
    console.log('5234523452345243524352345234523452345234 ', attIds);
    if (attIds) {
        message = 'SUCCESS';
    }
    res.send(message);
});

// // DATABAES OPERATIONS
app.get('/db/readRecords', function(req,res){
    dbOperations.getRecords(req,res);
});
app.get('/db/addRecord', function(req,res){
    dbOperations.addRecord(req,res);
});
app.get('/db/delRecord', function(req,res){
    dbOperations.delRecord(req,res);
});
app.get('/db/createTable', function(req,res){
    console.log('createtable');
    dbOperations.createTable(req,res);
});
app.get('/db/dropTable', function(req,res){
    dbOperations.dropTable(req,res);
});
