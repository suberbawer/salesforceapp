var sf = require('jsforce');
var express = require('express');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('https');
var archiver = require('archiver');
//---------- variables test
var async = require("async");
//-----------------
var dbOperations = require("./database/database.js");

var conn;
var docIds;

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
            // Saving in postgres
            addRecord(conn.accessToken, conn.refreshToken, conn.instanceUrl);
            res.end();
        }
    });
});

//app.get('/attachments', function(req, res) {
function queryDocuments(req, res, credentials) {
    // if auth has not been set, redirect to index
    console.log('CREDENTIALS---------', credentials);
    if (credentials.length == 0 || !credentials[credentials.length - 1].access_token || !credentials[credentials.length - 1].instance_url) {
        console.log('LOGIN PLEASE');
        res.redirect('/');
    } else {
        if (docIds) {
            var pdf_results = [];
            //
            // THIS WILL NEED THE FILTER WHERE Id in content documents ids sent from salesforce - CHANGE METHOD OF QUERY
            //
            var query = 'SELECT Id, Title, FileType, ContentSize, VersionData FROM ContentVersion';

            // open connection with client's stored OAuth details
            conn = new sf.Connection({
                instanceUrl: credentials[credentials.length - 1].instance_url,
                accessToken: credentials[credentials.length - 1].access_token,
            });

            var accessToken = credentials[credentials.length - 1].access_token;

            conn.on("refresh", function(accessToken, res) {
                console.log('SE REFRESCO');
              // Refresh event will be fired when renewed access token
              // to store it in your storage for next request
            });
            // First query on documents then into content documents to retrieve the file
            conn.query(query, function(err, result) {
                if (err) {
                    return console.error('Document query error: ', err);
                } else {
                    if (result.done && result.records.length > 0) {
                        var pdfs = [];
                        // Hack to test with selected pdf
                        for (var i=0; i < result.records.length; i++) {
                            if (result.records[i].FileType == 'PDF') {
                                pdfs.push(result.records[i]);
                            }
                        }

                        if (pdfs.length == 0) {
                            pdfs = result.records;
                        }
                        req.session.pdf_results = pdfs;
                        // get pdf from salesforce to process
                        //res.redirect('/getpdf');
                        console.log('QUERY DOCUMENTS REDIRECT');
                        getDocuments(req, res, accessToken);
                    }
                }
            });
        } else {
            res.write('NO ATTACHMENTS IN THIS DOCUMENT  ');
            res.end();
        }
    }
}
//);

//app.get('/getpdf', function(request, response) {
function getDocuments(request, response, accessToken) {
    // Variables
    var zip = archiver.create('zip', {});
    var output = fs.createWriteStream('outputZip.zip');
    var count = 0;
    var file;
    var req;
    var files = [];
    // First title
    //var title_pdf = request.session.pdf_results[0].Title;

    var options = {
        hostname: 'na22.salesforce.com',
        path: '',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
    };
    // Bind zip to output
    zip.pipe(output);

    async.forEachOfSeries(request.session.pdf_results, function (pdf, key, callback) {
        options.path = pdf.VersionData;
        req = new http.request(options, function(res) {
            // Create empty file
            file = fs.createWriteStream(pdf.Title);
            res.on('data', function (chunk) {
                // Write file with chunks
                file.write(chunk);
            });

            res.on('end', function() {
                files.push(pdf);
                callback();
            });
        });

        // If error show message and finish response
        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            return callback(e);
        });
        req.end();
    }, function (err) {
        if (err) {
            console.error(err.message)
            response.write('Error in request, please retry or contact your Administrator');
            response.end();
        };
        for (var i=0; i < files.length; i++) {
            zip.append(fs.createReadStream(files[i].Title), {name: files[i].Title});
            // When finish close zip and post into chatter
            if (i+1 == files.length) {
                zip.finalize();
                console.log('GET DOCUMENTS ASYNC AND ZIPIT REDIRECT TO POST');
                //response.redirect('/postchatter');
                postToChatter(request, response, accessToken);
            }
        }
    });
}
//);

// app.get('/postchatter', function(request, response) {
function postToChatter(request, response, accessToken) {
    var options = {
      hostname: 'na22.salesforce.com',
      path: '/services/data/v34.0/chatter/feed-elements',
      method: 'POST',
      headers: {
          'Content-Type': 'multipart/form-data; boundary=a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq',
          'Authorization': 'OAuth ' + accessToken
      }
    };

    var CRLF = '\r\n';
    var postData = '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq' + CRLF +
        'Content-Disposition: form-data; name="json"' + CRLF +
        'Content-Type: application/json; charset=UTF-8' + CRLF +
        CRLF +
        '{' + CRLF +
           '"body":{' + CRLF +
              '"messageSegments":[' + CRLF +
                 '{' + CRLF +
                    '"type":"Text",' + CRLF +
                    '"text":""' + CRLF +
                 '}' + CRLF +
              ']' + CRLF +
           '},' + CRLF +
           '"capabilities":{' + CRLF +
              '"content":{' + CRLF +
                 '"description":"Generated Heroku Zip Pdx",' + CRLF +
                 '"title":"test1.zip"' + CRLF +
              '}' + CRLF +
           '},' + CRLF +
           '"feedElementType":"FeedItem",' + CRLF +
           '"subjectId":"me"' + CRLF +
        '}' + CRLF +
        CRLF +
        '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq' + CRLF +
        'Content-Disposition: form-data; name="feedElementFileUpload"; filename="Test.zip"' + CRLF +
        'Content-Type: application/octet-stream; charset=ISO-8859-1' + CRLF +
        CRLF;

    var req = http.request(options, function(res) {
      res.on('end', function() {
          console.log('respuesta en end-------');
        //   res.write('Check Chatter to see message');
        });
    });

    // If error show message and finish response
    req.on('error', function(e) {
        response.write('Error in request, please retry or contact your Administrator');
        response.end();
    });

    // req.on('response', function(res) {
    //     console.log('SUCESS: CHECK CHATTER');
    //     response.write('SUCCESS: Check Chatter to find the ZIP file :)');
    //     response.end();
    // });

    req.on('end', function(res) {
        console.log('EN EL END', res);

    });

    // write data to request body
    req.write(postData);

    fs.createReadStream('outputZip.zip')
        .on('end', function() {
            req.end(CRLF + '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq--' + CRLF);
        })
        .pipe(req, {end:false});
}
//);

// Recieve contet ids from salesforce
app.post('/test', function(req, res) {
    var message = 'ERROR';
    docIds = req.body;
    if (docIds) {
        message = 'SUCCESS';
    }
    console.log('LOS IDS DE LOS DOCS SON', docIds);
    // Get credentials from postgres
    getRecords(req, res);
});

// DATABAES OPERATIONS
function getRecords(req, res) {
    var pg = require('pg');
    //You can run command "heroku config" to see what is Database URL from Heroku belt
    var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
    var f_result = new Object;
    var client = new pg.Client(conString);
    client.connect();
    var query = client.query("select * from loggin_data");
    var results = [];

    query.on("row", function (row) {
        results.push(row);
    });

    query.on("end", function () {
        client.end();
        queryDocuments(req, res, results);
    });
}

function addRecord (accessToken, refreshToken, instance_url) {
    dbOperations.addRecord(accessToken, refreshToken, instance_url);
}

app.get('/db/delRecord', function(req,res){
    dbOperations.delRecord(req,res);
});
app.get('/db/createTable', function(req,res){
    dbOperations.createTable(req,res);
});
app.get('/db/dropTable', function(req,res){
    dbOperations.dropTable(req,res);
});
