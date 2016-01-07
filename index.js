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
    clientId : '3MVG9fMtCkV6eLhdV835GqoFVmPFRhrD9E3.yj1lRxKn5OP4B.FLmkRFzkesl_0VqS8edlLuptIVa_kgx_fe7',
    clientSecret : '5032836692064605706',
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
    var conn = new sf.Connection({oauth2: oauth2});
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

/**
 * Function that request documents asyncrhonously from salesforce and create a zip with all documents inside
 *
 * @param request, response - express frame request and response
 * @param crendetials - credentials of logged user to get acces token and some needed information
 * @param documents - wrapper that represent needed information of documents to get them
 */
function getDocuments(request, response, credentials, documents) {
        console.log('get documents-------');

    // Variables
    var zip         = archiver.create('zip', {});
    var output      = fs.createWriteStream('outputZip.zip');
    var accessToken = credentials[credentials.length - 1].access_token;
    var sVersion    = credentials[credentials.length - 1].salesforce_version;
    var files       = [];
    var file;
    var req;
    console.log('ACCESSTOKEN', accessToken);
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

    async.forEachOfSeries(documents, function (doc, key, callback) {
        options.path = '/services/data/v'+ sVersion +'/sobjects/ContentVersion/'+doc.docId+'/VersionData';
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
            //console.log('ZIP ', zip);
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
    console.log('post to chatter-------');
    var accessToken = credentials[credentials.length - 1].access_token;
    var sVersion    = credentials[credentials.length - 1].salesforce_version;
    var pathUrl     = credentials[credentials.length - 1].instance_url;
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
        '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq' + CRLF +
        'Content-Disposition: form-data; name="feedElementFileUpload"; filename="'+ parentItemName +'.zip"' + CRLF +
        'Content-Type: application/octet-stream; charset=ISO-8859-1' + CRLF +
        CRLF;
    // Execute request
    var req = new http.request(options, function(res) {
        console.log('REQ CODE', res.statusCode);
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
            } else {
                parentItemName = req.body[index].title;
            }
        }
        // Get credentials by user from postgres
        getRecordsByUser(req, res, req.body[0].userId, null, req.body);
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
