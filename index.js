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
var isSandbox      = true;

// app Configuration
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files ( to add html to the popup)
app.set('views', __dirname + '/views/pages');
app.set('view engine', 'ejs');

var oauth2;

// Get authz url and redirect to it.
app.get('/', function(req, res) {
    oauth2 = new sf.OAuth2({
        // we can change loginUrl to connect to sandbox or prerelease env.
        loginUrl : !isSandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com',
        clientId : '3MVG9uudbyLbNPZOVOmep0tsIfj7okCA1HIdTPALdUIjQzwJWgYJ6PHQdxdi6WSMh1gNtdbfKyWDP2aR2kYTw',
        clientSecret : '5644212675256863801',
        redirectUri : 'https://salesforceapi.herokuapp.com/callback'
    });
    console.log('is sandbox------ ', isSandbox);
    res.redirect(oauth2.getAuthorizationUrl());
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

/* OAuth callback from SF, pass received auth code and get access token */
app.get('/callback', function(req, res) {
    var conn = new sf.Connection({oauth2: oauth2});
    var code = req.query.code;
    console.log('connnnnnn ', conn.instanceUrl);
    conn.authorize(code, function(err, userInfo) {
        if (err) {
            return console.error(err);
        } else {
            // Saving/Updating in postgres by salesforce user id
            getRecordsByUser(req, res, userInfo.id, conn, null);
        }
    });
});

/**
 * Function that request documents asyncrhonously from salesforce and create a zip with all documents inside
 *
 * @param request, response - express frame request and response
 * @param crendetials - credentials of logged user to get acces token and some needed information
 * @param documents - wrapper that represent needed information of documents to get them
 */
function getDocuments(request, response, credentials, documents) {
    // Variables
    var zip         = archiver.create('zip', {});
    var output      = fs.createWriteStream('outputZip.zip');
    var accessToken = credentials[credentials.length - 1].access_token;
    var sVersion    = credentials[credentials.length - 1].salesforce_version;
    var hostUrl     = credentials[credentials.length - 1].instance_url.substring(8);
    var files       = [];
    var docNames    = [];
    var index       = 0;
    var file;
    var req;

    var options = {
        hostname: hostUrl,
        path: '',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        }
    };
    // Bind zip to output
    zip.pipe(output);

    async.forEachOfSeries(documents, function (doc, key, callback) {
        options.path = '/services/data/v'+ sVersion +'/sobjects/ContentVersion/'+doc.docId+'/VersionData';
        req = new http.request(options, function(res) {
            var doc_title       = doc.title;
            var doc_extension   = doc.extension;
            var doc_title_vector = doc.title.split('.');

            if ( doc_title_vector[doc_title_vector.length-1] == doc_extension){
                doc_title = doc_title_vector.slice(0,doc_title_vector.length-1).join('.');
            }

            if (docNames.indexOf(doc_title) > -1) {
                index++
                doc_title = doc_title + '('+ index +')';
            }
            docNames.push(doc_title);
            // Create empty file
            file = fs.createWriteStream(doc_title +'.'+ doc_extension);

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

                zip.append(fs.createReadStream(doc_title +'.'+ doc_extension), {name: doc_title +'.'+ doc_extension});
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
            postToChatter(request, response, credentials);
        });
    });
}

/**
 * Function that send zip file to salesforce chatter via chatter api
 *
 * @param request, response - express frame request and response
 * @param accesToke - user access token authorization
 * @param sVersion - api version to set url request
 */
function postToChatter(request, response, credentials) {
    var accessToken = credentials[credentials.length - 1].access_token;
    var sVersion    = credentials[credentials.length - 1].salesforce_version;
    var pathUrl     = credentials[credentials.length - 1].instance_url.substring(8);
    // Boundary
    var boundary = 'a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq';
    // Options to create the request
    var options = {
      hostname: pathUrl,
      path: '/services/data/v'+ sVersion +'/chatter/feed-elements',
      method: 'POST',
      headers: {
          'Content-Type': 'multipart/form-data; boundary='+boundary,
          'Authorization': 'OAuth ' + accessToken
      }
    };
    var CRLF = '\r\n';
    // Request
    var postData = '--'+ boundary + CRLF +
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
                 '"description":"'+ parentItemName +' Generated Zip",' + CRLF +
                 '"title":"'+ parentItemName +'.zip"' + CRLF +
              '}' + CRLF +
           '},' + CRLF +
           '"feedElementType":"FeedItem",' + CRLF +
           '"subjectId":"me"' + CRLF +
        '}' + CRLF +
        CRLF +
        '--'+ boundary + CRLF +
        'Content-Disposition: form-data; name="feedElementFileUpload"; filename="'+ parentItemName +'.zip"' + CRLF +
        'Content-Type: application/octet-stream; charset=ISO-8859-1' + CRLF +
        CRLF;

    // Execute request
    var req = new http.request(options, function(res) {
        response.sendStatus(res.statusCode);
        response.end();
    });

    // If error show message and finish response
    req.on('error', function(e) {
        console.log('Error in request, please retry or contact your Administrator', e);
        response.sendStatus(e);
        response.end();
    });

    // write data to request body
    req.write(postData);
    // Add final boundary and bind request to zip
    fs.createReadStream('outputZip.zip')
        .on('end', function() {
            req.end(CRLF + '--'+ boundary +'--' + CRLF);
        })
        .pipe(req, {end:false});

}

// Function that recieve wrapper documents from salesforce to init the process
app.post('/document_ids', function(req, res) {
    if (req.body) {
        for (var index in req.body) {
            if (req.body[index].itemName != '') {
                // Get item name to set zip name
                parentItemName = req.body[index].itemName;
                break;
            }
        }
        if (parentItemName) {
            // Get credentials by user from postgres
            getRecordsByUser(req, res, req.body[0].userId, null, req.body);
        } else {
            // Prevent empty item names
            parentItemName = 'Generated Zip';
        }
    } else {
        res.sendStatus('Body of request is empty');
        res.end();
    }
});

// DATABAES OPERATIONS

/**
 * Function that get datata by user from database
 *
 * @param request, response - express frame request and response
 * @param userId - unique salesforce user id to get the requested information from db
 * @param conn - generated connection between sf and nodejs
 * @param documents - list of wrapper documents from salesforce
 */
function getRecordsByUser(req, res, userId, conn, documents) {
    var pg        = require('pg');
    var conString = process.env.DATABASE_URL;
    var f_result  = new Object;
    var sandbox   = [];
    var isSandbox = false;
    var client    = new pg.Client(conString);
    client.connect();

    // Get loggin_data by sf user
    var query   = client.query("select * from loggin_data where user_id=($1)", [userId]);
    var results = [];
    // Fill list with resutls by row
    query.on("row", function (row) {
        results.push(row);
    });
    // When query finish then proceed
    query.on("end", function () {
        client.end();
        if (documents) {
            if (results.length > 0) {
                // Continue with flow to post in chatter ( get documents from sf )
                getDocuments(req, res, results, documents);
            } else {
                res.sendStatus('401');
                res.end();
            }
        } else {
            console.log('conn.instanceUrl ----- ', conn.instanceUrl);
            if (results.length > 0) {
                // Update record for this user
                updateRecord(userId, conn.accessToken, conn.refreshToken, conn.instanceUrl, conn.version);
            } else {
                // Add new record for user
                addRecord(userId, conn.accessToken, conn.refreshToken, conn.instanceUrl, conn.version);
            }
            // Render user information
            res.render('index.ejs');
        }
    });
}

/**
 * Function that insert datata to login_data table in db
 *
 * @param userId - unique salesforce user id to get the requested information from db
 * @param accessToken - sf user access token authorization
 * @param refreshToken - sf user acces refresh token auth
 * @param instance_url - sf instance url
 * @param salesforce_version - api version
 */
function addRecord(userId, accessToken, refreshToken, instance_url, salesforce_version) {
    dbOperations.addRecord(userId, accessToken, refreshToken, instance_url, salesforce_version);
}

/**
 * Function that update datata from login_data table in db
 *
 * @param userId - unique salesforce user id to get the requested information from db
 * @param accessToken - sf user access token authorization
 * @param refreshToken - sf user acces refresh token auth
 * @param instance_url - sf instance url
 * @param salesforce_version - api version
 */
function updateRecord(userId, accessToken, refreshToken, instance_url, salesforce_version) {
    dbOperations.updateRecord(userId, accessToken, refreshToken, instance_url, salesforce_version);
}

// Function that read all records of loggin_data table
app.get('/db/readRecords', function(req,res){
    dbOperations.readRecords(req,res);
});

// Function that delete a record by id of loggin_data table
app.get('/db/delRecord', function(req,res){
    dbOperations.delRecord(req,res);
});

// Function that create loggin_data table
app.get('/db/createTable', function(req,res){
    dbOperations.createTable(req,res);
});

// Function that drop loggin_data table
app.get('/db/dropTable', function(req,res){
    dbOperations.dropTable(req,res);
});

//Adding check if connected capability
app.get('/connStatus/:userId', function(req,res){
    var pg        = require('pg');
    var conString = process.env.DATABASE_URL;
    var f_result  = new Object;
    var client    = new pg.Client(conString);
    var userId = req.params.userId;
    client.connect();
    // Get loggin_data by sf user
    var query   = client.query("select * from loggin_data where user_id=($1)", [userId]);
    var results = [];
    // Fill list with resutls by row
    query.on("row", function (row) {
        results.push(row);
    });
    // When query finish then proceed
    query.on("end", function () {
        client.end();
        res.setHeader('Content-Type', 'application/json');

        var user = results.length > 0 ? results[0] : false;
        if ( user ){
            var conn = new sf.Connection({
              instanceUrl : user.instance_url,
              accessToken : user.access_token
            });
            conn.query("SELECT Id, Name FROM Account", function(err, result) {
              if (err){
                  res.sendStatus('401');
                  res.end();
              }
              res.sendStatus('200');
              res.end();
            }).run({ autoFetch : true, maxFetch : 1 });
        }else{
            res.sendStatus('401');
            res.end();
        }
    });
});

app.post('/check_sandbox', function(req, res) {
    if (req.body) {
        isSandbox = req.body[0].IsSandbox;
        res.sendStatus('200');
        res.end();
    } else {
        res.sendStatus('Body of request is empty');
        res.end();
    }
});
