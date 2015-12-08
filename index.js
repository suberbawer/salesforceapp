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


// conn = new sf.Connection({
//   oauth2 : {
//       clientId : '3MVG91ftikjGaMd_epnylI.6EF7HD13f4Vz5k27V.mtepNErOxzFVdczAIGPkckY57Uy5V9EK5UohtiJM00t7',
//       clientSecret : '4671395917099215169',
//       redirectUri : 'https://salesforceapi.herokuapp.com/callback'
//   },
//   accessToken: '00D15000000Ev0D!ARIAQKW6xJgwhyNVxXXv9fJ6AZ9twovcSPmzifvsOYw3kwj325_MMdBgaBcA772sVspJUXWt2obujofIcgAQZx91E839MGVM',
//   instanceUrl: 'https://na22.salesforce.com',
//   refreshToken : '5Aep861O8xCPABpkD6A0AY5T.SVV3h_eTfvx1.IS41u6Rhz6ymV8Ghjjuehc9pWPhrOIBSVtfCogyKasr3x2d7F'
// });
// conn.on("refresh", function(accessToken, res) {
//   // Refresh event will be fired when renewed access token
//   // to store it in your storage for next request
// });


// Get authz url and redirect to it.
app.get('/', function(req, res) {
    console.log('---------------------- estoy adentro de la autorizacion');
    res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
});



app.get('/magia', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM loggin_data', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
      { console.log(result.rows) ; }

    });
  });
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/callback', function(req, res) {
    conn = new sf.Connection({ oauth2 : oauth2 });
    var code = req.query.code;

    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }

        var aT = conn.accessToken != undefined ? encodeURIComponent(conn.accessToken) : '';
        var iUrl = conn.instanceUrl != undefined ? encodeURIComponent(conn.instanceUrl) : '';
        var rT = conn.refreshToken != undefined ? encodeURIComponent(conn.refreshToken) : '';

        var url = '/db/addRecord?aT=' + aT + '&iUrl=' + iUrl + '&rT=' + rT;
        console.log('url 555555555v', url);
        // if ( dbOperations.getRecords(req,res) == undefined) {
            // add tokens and user data
            //res.redirect(url);
        // } else {
            res.redirect('/accounts');
        // }
    });
});

app.get('/accounts', function(req, res) {
    // var test = res.redirect('/db/readRecords');
    // console.log('acces token', test.accessToken);
    // if auth has not been set, redirect to index
    // if (accessToken == null || instanceUrl == null) { res.redirect('/'); }

    // var query = "SELECT Id, Name FROM Account";
    // open connection with client's stored OAuth details
    // accessToken: req.session.accesToken,
    // instanceUrl: req.session.instanceUrl
    // conn = new sf.Connection({
    //     accessToken: '00D15000000Ev0D!ARIAQKW6xJgwhyNVxXXv9fJ6AZ9twovcSPmzifvsOYw3kwj325_MMdBgaBcA772sVspJUXWt2obujofIcgAQZx91E839MGVM',
    //     instanceUrl: 'https://na22.salesforce.com'
    // });

    // conn.query(query, function(err, result) {
    //     if (err) {
    //         console.error('error-----', err);
    //         res.redirect('/');
    //     }
    //     console.log('resultado de query ', result);
    //     //res.render('accounts', {title: 'Accounts List', accounts: result.records});
    // });
    conn = new sf.connection({ oauth2 : oauth2});
    var records = [];
    conn.query("SELECT Id FROM Account LIMIT 1000", function(err, result) {
      if (err) { return console.error(err); }
      console.log("total : " + result.totalSize);
      console.log("fetched : " + result.records.length);
    //   console.log("done ? : " + result.done);
    //   if (!result.done) {
    //     // you can use the locator to fetch next records set.
    //     // Connection#queryMore()
    //     console.log("next records URL : " + result.nextRecordsUrl);
    //   }
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
