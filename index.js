var sf = require('jsforce');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var url = require('url') ;
var attIds;

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
app.get('/oauth2/auth', function(req, res) {
    console.log('---------------------- estoy adentro de la autorizacion');
    res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/callback', function(req, res) {
    var conn = new sf.Connection({ oauth2 : oauth2 });
    var code = req.query.code;
    console.log('-------------code', req.query.code);
    var urlObj = url.parse(req.url,true).query;
    console.log('-code object', urlObj);
    console.log('-code from obj', urlObj.code);

    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.log('erroooooooooor ',err); }
        // Now you can get the access token, refresh token, and instance URL information.
        // Save them to establish connection next time.
        console.log('-----token', conn.accessToken);
        console.log('------refresh', conn.refreshToken);
        console.log('------url ', conn.instanceUrl);
        console.log('***********userInfo ', userInfo);
        console.log("User ID: " + userInfo.id);
        console.log("Org ID: " + userInfo.organizationId);
        // ...
    });
    // var records = [];
    // conn.query("SELECT Id, Name FROM Account", function(err, result) {
    //     if (err) { return console.error(err); }
    //     console.log("total : " + result.totalSize);
    //     console.log("fetched : " + result.records.length);
    //     console.log("done ? : " + result.done);
    //     if (!result.done) {
    //         // you can use the locator to fetch next records set.
    //         // Connection#queryMore()
    //         console.log("next records URL : " + result.nextRecordsUrl);
    //     }
    // });
});

// var records = [];
// conn.query("SELECT Id, Name FROM Account", function(err, result) {
//     if (!err) {
//         console.log("total : " + result.totalSize);
//         console.log("fetched : " + result.records.length);
//     }
// });

app.post('/test', function(req, res) {
    var message = 'ERROR';
    attIds = req.body;
    console.log('5234523452345243524352345234523452345234 ', attIds);
    if (attIds) {
        message = 'SUCCESS';
    }
    res.send(message);
});
