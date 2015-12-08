var sf = require('jsforce');
var express = require('express');
var session = require('express-session');
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

app.use(session({secret: 'demosalesforceapi'}));
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

// Get authz url and redirect to it.
app.get('/', function(req, res) {
    res.redirect(oauth2.getAuthorizationUrl());
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

/* OAuth callback from SF, pass received auth code and get access token */

app.get('/callback', function(req, res) {
    conn = new sf.Connection({oauth2: oauth2});
    var code = req.param('code');
    conn.authorize(code, function(err, userInfo) {
        if (err) {
            return console.error(err);
        } else {
            console.log('refreshtoken', conn.refreshToken);
            console.log('toke', conn.accessToken);
            console.log('url', conn.instanceUrl);
            console.log('user ', userInfo.id);

            req.session.accessToken = conn.accessToken;
            req.session.instanceUrl = conn.instanceUrl;
            req.session.refreshToken = conn.refreshToken;

            var app_json = { "accessToken": req.session.accessToken, "instanceUrl": req.session.instanceUrl, "OrgID":userInfo.organizationId, "refreshtoken": req.session.refreshToken}; //userInfo.organizationId
            res.redirect('/accounts');
        }
    });
});

app.get('/accounts', function(req, res) {
    // if auth has not been set, redirect to index
    if (typeof req.session == 'undefined' || !req.session.accessToken || !req.session.instanceUrl) {
        console.log(Date() + ' - ' + run_id + ' - Not yet authorized, so redirecting to auth');
        res.redirect('/');
    } else {
        var query = 'SELECT Id FROM Document__c';
        // open connection with client's stored OAuth details
        conn = new sf.Connection({
            instanceUrl: req.session.instanceUrl,
            accessToken: req.session.accessToken
        });
        conn.query(query, function(err, result) {
            if (err) {
                return console.error('error en la query', err);
            }
            console.log('result-----------', result.totalSize);
            console.log('result2-----------', result.records[0].attributes.url);
            console.log('fetched----------', result.records.length);
            res.redirect('/postchatt');
        });
    }
});

app.get('/postchatt', function(req, res) {
    // open connection with client's stored OAuth details
    conn = new sf.Connection({
        instanceUrl: req.session.instanceUrl,
        accessToken: req.session.accessToken
    });
    conn.chatter.resource('/feed-elements').create({
        "body":{
            "messageSegments":[{
                "type":"Text",
                "text":"Please accept this receipt."
             }]
        },
        "feedElementType":"FeedItem",
        "subjectId":"me"
        }, function(err, result) {
            if (err) { return console.error(err); }
            console.log("Id: " + result.id);
            console.log("URL: " + result.url);
            console.log("Body: " + result.body.messageSegments[0].text);
            console.log("Comments URL: " + result.capabilities.comments.page.currentPageUrl);
        });
});

app.post('/test', function(req, res) {
    var message = 'ERROR';
    attIds = req.body;
    console.log('attachments ids+++++++++ ', attIds);
    if (attIds) {
        message = 'SUCCESS';
    }
    res.send(message);
    if (attIds) {
        res.redirect('/');
    }
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
    dbOperations.createTable(req,res);
});
app.get('/db/dropTable', function(req,res){
    dbOperations.dropTable(req,res);
});
