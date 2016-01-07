// Variables
var sf           = require('jsforce');
var express      = require('express');
var app          = express();
var bodyParser   = require('body-parser');
var fs           = require('fs');
var http         = require('https');
var archiver     = require('archiver');
var async        = require("async");
var dbOperations = require("./database/database.js");
var parentItemName = '';

// app Configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files ( to add html to the popup)
app.set('views', __dirname + '/views/pages');
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
var conn;
/* OAuth callback from SF, pass received auth code and get access token */
app.get('/callback', function(req, res) {
    conn = new sf.Connection({oauth2: oauth2});
    var code = req.query.code;

    conn.authorize(code, function(err, userInfo) {
        if (err) {
            return console.error(err);
        } else {
            // Saving/Updating in postgres by salesforce user id
            getRecordsByUser(req, res, userInfo.id, conn, null);
        }
    });
});

function getDocuments(request, response, credentials, documents) {
    // Variables
    var zip = archiver.create('zip', {});
    var output = fs.createWriteStream('outputZip.zip');
    var accessToken = credentials[credentials.length - 1].access_token;
    var file;
    var req;
    var files = [];

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
    console.log('CHECK VERSION OF SALESFORCE 1-- ', conn.version);
    var conn = new sf.Connection({oauth2: oauth2});
    console.log('CHECK VERSION OF SALESFORCE ', conn.version);

    async.forEachOfSeries(documents, function (doc, key, callback) {
        options.path = '/services/data/v35.0/sobjects/ContentVersion/'+doc.docId+'/VersionData';
        req = new http.request(options, function(res) {
            // Create empty file
            file = fs.createWriteStream(doc.title);
            res.on('data', function (chunk) {
                // Write file with chunks
                var bufferStore = file.write(chunk);
                if (bufferStore == false) {
                    res.pause();
                }
            });

            file.on('drain', function() {
                res.resume();
            });

            res.on('end', function() {
                zip.append(fs.createReadStream(doc.title), {name: doc.title});
                zip.on('entry', function(entry) {
                    if (files.indexOf(key) == -1) {
                        files.push(key);
                        callback();
                    }
                });
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
            console.error(err.message);
            response.sendStatus(err.message);
            response.end();
        };
        zip.finalize();
        zip.on('end', function() {
            postToChatter(request, response, accessToken);
        });
    });
}

function postToChatter(request, response, accessToken) {
    var options = {
      hostname: 'na22.salesforce.com',
      path: '/services/data/v35.0/chatter/feed-elements',
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
                 '"description":"parentItemName Generated Zip",' + CRLF +
                 '"title":"'+parentItemName+'.zip"' + CRLF +
              '}' + CRLF +
           '},' + CRLF +
           '"feedElementType":"FeedItem",' + CRLF +
           '"subjectId":"me"' + CRLF +
        '}' + CRLF +
        CRLF +
        '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq' + CRLF +
        'Content-Disposition: form-data; name="feedElementFileUpload"; filename="'+parentItemName+'.zip"' + CRLF +
        'Content-Type: application/octet-stream; charset=ISO-8859-1' + CRLF +
        CRLF;

    var req = new http.request(options, function(res) {
        response.sendStatus(res.statusCode);
        response.end();
    });

    // If error show message and finish response
    req.on('error', function(e) {
        console.log('Error in request, please retry or contact your Administrator', e);
        response.send(e);
        response.end();
    });

    // write data to request body
    req.write(postData);

    fs.createReadStream('outputZip.zip')
        .on('end', function() {
            req.end(CRLF + '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq--' + CRLF);
        })
        .pipe(req, {end:false});

}

// Recieve contet ids from salesforce
app.post('/document_ids', function(req, res) {
    if (req.body) {
        for (var index in req.body) {
            if (req.body[index].itemName != '') {
                parentItemName = req.body[index].itemName;
                break;
            }
        }
        // Get credentials from postgres
        getRecordsByUser(req, res, req.body[0].userId, null, req.body);
    } else {
        res.sendStatus('Body of request is empty');
        res.end();
    }
});

// DATABAES OPERATIONS
function getRecordsByUser(req, res, userId, conn, documents) {
    var pg = require('pg');
    //You can run command "heroku config" to see what is Database URL from Heroku belt
    var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
    var f_result = new Object;
    var client = new pg.Client(conString);
    client.connect();

    var query = client.query("select * from loggin_data where user_id=($1)", [userId]);
    var results = [];

    query.on("row", function (row) {
        results.push(row);
    });

    query.on("end", function () {
        client.end();
        if (documents) {
            if (results.length > 0) {
                getDocuments(req, res, results, documents);
            } else {
                res.sendStatus('401');
                res.end();
            }
        } else {
            if (results.length > 0) {
                // Update record for this user
                updateRecord(userId, conn.accessToken, conn.refreshToken, conn.instanceUrl);
            } else {
                // Add new record for user
                addRecord(userId, conn.accessToken, conn.refreshToken, conn.instanceUrl);
            }
            res.render('index.ejs');
        }
    });
}

function addRecord(userId, accessToken, refreshToken, instance_url) {
    dbOperations.addRecord(userId, accessToken, refreshToken, instance_url);
}

function updateRecord(userId, accessToken, refreshToken, instance_url) {
    dbOperations.updateRecord(userId, accessToken, refreshToken, instance_url);
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
