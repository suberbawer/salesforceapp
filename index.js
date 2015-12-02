var sf = require('node-salesforce');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(express.bodyParser());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    console.log('asdfasdfasdfasdfasdfasdf');
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

var oauth2 = new sf.OAuth2({
  // we can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : '3MVG91ftikjGaMd_epnylI.6EF7HD13f4Vz5k27V.mtepNErOxzFVdczAIGPkckY57Uy5V9EK5UohtiJM00t7',
  clientSecret : '4671395917099215169',
  redirectUri : 'https://salesforceapi.herokuapp.com'
});

// // Get authz url and redirect to it.
app.get('/oauth2/auth', function(req, res) {
    res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
});
//
// app.get('/oauth2/callback', function(req, res) {
//     var conn = new sf.Connection({ oauth2 : oauth2 });
//     var code = req.param('code');
//     conn.authorize(code, function(err, userInfo) {
//         if (err) { return console.error(err); }
//         // Now you can get the access token, refresh token, and instance URL information.
//         // Save them to establish connection next time.
//         console.log(conn.accessToken);
//         console.log(conn.refreshToken);
//         console.log(conn.instanceUrl);
//         console.log("User ID: " + userInfo.id);
//         console.log("Org ID: " + userInfo.organizationId);
//         // ...
//     });
//     var records = [];
//     conn.query("SELECT Id, Name FROM Account", function(err, result) {
//         if (err) { return console.error(err); }
//         console.log("total : " + result.totalSize);
//         console.log("fetched : " + result.records.length);
//         console.log("done ? : " + result.done);
//         if (!result.done) {
//             // you can use the locator to fetch next records set.
//             // Connection#queryMore()
//             console.log("next records URL : " + result.nextRecordsUrl);
//         }
//     });
// });
app.post('/test', function(req, res) {
    //var hola = req.body.content;
    var hola = req.body;
    console.log(hola);
    res.send('hola');
});
