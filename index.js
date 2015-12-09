var sf = require('jsforce');
var express = require('express');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var url = require('url') ;
var pg = require('pg');
var fs = require('fs');
var http = require('http');
require('buffer-concat');
var dbOperations = require("./database/database.js");

var conn;
var docIds;
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
            req.session.accessToken = conn.accessToken;
            req.session.instanceUrl = conn.instanceUrl;
            req.session.refreshToken = conn.refreshToken;
            console.log('tokenpppppppppppp ', conn.accessToken)

            var app_json = { "accessToken": req.session.accessToken, "instanceUrl": req.session.instanceUrl, "OrgID":userInfo.organizationId, "refreshtoken": req.session.refreshToken}; //userInfo.organizationId
            res.redirect('/attachments');
        }
    });
});

app.get('/attachments', function(req, res) {
    docIds = 'just to execute'; // hardcoded to demo
    // if auth has not been set, redirect to index
    if (typeof req.session == 'undefined' || !req.session.accessToken || !req.session.instanceUrl) {
        res.redirect('/');
    } else {
        if (docIds) {
            var pdf_results = [];
            //
            // THIS WILL NEED THE FILTER WHERE Id in content documents ids sent from salesforce - CHANGE METHOD OF QUERY
            //
            var query = 'SELECT Id, FileType, Title FROM ContentDocument';
            // open connection with client's stored OAuth details
            conn = new sf.Connection({
                instanceUrl: req.session.instanceUrl,
                accessToken: req.session.accessToken
            });
            // First query on documents then into content documents to retrieve the file
            conn.query(query, function(err, result) {
                if (err) {
                    return console.error('Document query error: ', err);
                } else {
                    console.log('result-----------', result.totalSize);
                    console.log('fetched----------', result.records.length);
                    console.log('record-----------', fs.readFileSync(result.records[0]));

                    for (var pos = 0; pos < result.records.length; pos++) {
                        if (result.records[pos].FileType == 'PDF') {
                            pdf_results.push(result.records[pos]);
                        }
                    }
                    // console.log('pdfresults------------', pdf_results.length);
                    if (result.done && pdf_results.length > 0) {
                        //sendToChatter(pdf_results);
                        res.redirect('/postchatter?attachments=' + pdf_results);
                    }
                }
            });
        } else {
            res.write('NO ATTACHMENTS IN THIS DOCUMENT  ');
            res.end();
        }
    }
});

// app.get('/postchatter', function(req, res) {
//     // open connection with client's stored OAuth details
//     conn = new sf.Connection({
//         instanceUrl: req.session.instanceUrl,
//         accessToken: req.session.accessToken
//     });
//     var record_url = req.param('record_url').split("/");
//     var id = record_url[record_url.length - 1];
//     conn.chatter.resource('/feed-elements').create({
//         "body":{
//             "messageSegments":[{
//                 "type":"Text",
//                 "text":"Testing chatter api, retrieved record id: " + id
//              }]
//         },
//         "feedElementType":"FeedItem",
//         "subjectId":"me"
//         }, function(err, result) {
//             if (err) { return console.error(err); }
//             // console.log("Id: " + result.id);
//             // console.log("URL: " + result.url);
//             // console.log("Body: " + result.body.messageSegments[0].text);
//             // console.log("Comments URL: " + result.capabilities.comments.page.currentPageUrl);
//             res.write('Check Chatter to see message');
//             res.end();
//         });
// });

// app.get('/postchatter', function(req, res) {
//     // open connection with client's stored OAuth details
//     conn = new sf.Connection({
//         instanceUrl: req.session.instanceUrl,
//         accessToken: req.session.accessToken
//     });
//     // pdf attachments to zip
//     var attachments = req.param('atts');
//     console.log('atts--------', attachments)
//     var item = {
//         "body":{
//             "messageSegments":[{
//                 "type":"Text",
//                 "text":"Testing chatter api, retrieved record id: "
//              }]
//         },
//         "feedElementType":"FeedItem",
//         "subjectId":"me"
//     };
//
//     item.capabilities =
//     {
//         "content" :
//         {
//             "description": "File attachment from Clienteling",
//             "title": "Some File"
//         }
//     };
//
//     var data = new FormData();
//     data.append("feedElement", JSON.stringify(item));
//     console.log('attachment pdf-----------', attachments[0]);
//     data.append("feedElementFileUpload", base64_encode(attachments[0]));
//
//     var req = new XMLHttpRequest();
//     //
//     // req.addEventListener("load", function(event)
//     //    {
//     //        success(req);
//     //    }, false);
//     // req.addEventListener("error", fail, false);
//     //
//     req.open("POST", "/services/data/v34.0/chatter/feed-elements", true);
//     req.setRequestHeader("Authorization", "OAuth " + req.session.accesToken);
//     req.send(data);
// });

app.get('/postchatter', function(req, res) {
    var attachments = req.param('attachments');
    console.log('atts-----------', attachments[0]);
    //var data = fs.readFileSync(attachments[0]);
    var data = attachments[0];
    console.log('readfile sync----------', data);
    var client;
    var req;

    /* As per http://www.w3.org/Protocols/rfc1341/7_2_Multipart.html */
    var crlf = "\r\n";
    var boundary = '---------------------------10102754414578508781458777923'; // Boundary: "--" + up to 70 ASCII chars + "\r\n"
    var delimiter = crlf + "--" + boundary;
    var preamble = ""; // ignored. a good place for non-standard mime info
    var epilogue = ""; // ignored. a good place to place a checksum, etc
    var headers = [
      'Content-Disposition: form-data; name="feedElementFileUpload"; filename="test.pdf"' + crlf,
      'Content-Type: application/octet-stream; charset=ISO-8859-1' + crlf,
    ];

    var closeDelimiter = delimiter + "--";
    var multipartBody; // = preamble + encapsulation + closeDelimiter + epilogue + crlf /* node doesn't add this */;

    multipartBody = Buffer.concat(
        new Buffer(preamble + delimiter + crlf + headers.join('') + crlf),
        data,
        new Buffer(closeDelimiter + epilogue)
    );
    console.log(multipartBody.length);


    // client = http.createClient(80, "www.phpletter.com");
    /* headers copied from a browser request logged in wireshark */
    req = request.post('/services/data/v34.0/chatter/feed-elements', {
        'Host': 'heroku',
        'User-Agent': 'Node.JS',
        'Authorization': req.session.accessToken,
        //'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        //'Accept-Language': 'en-us,en;q=0.5',
        // 'Accept-Encoding': 'gzip,deflate',
        //'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
        //'Keep-Alive': 115,
        //'Connection': 'keep-alive',
        //'Referer': 'http://www.phpletter.com/Demo/AjaxFileUpload-Demo/',
        //'Cookie': 'PHPSESSID=vrunqnvon9kv3675pq6r9ponb1; __utma=158605435.700113097.1294360062.1294360062.1294360062.1; __utmb=158605435; __utmc=158605435; __utmz=158605435.1294360062.1.1.utmccn=(organic)|utmcsr=google|utmctr=http+upload+demo|utmcmd=organic',
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        //'Content-Length': 258707
        'Content-Length': multipartBody.length
    });

    req.write(multipartBody);
    console.log('asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf');
    req.on('error', function (err) {
        console.log(err);
    });

    req.on('response', function (response) {
        console.log('response');

        response.setEncoding('utf8');

        response.on('data', function (chunk) {
            console.log(chunk.toString());
        });

        response.on('end', function () {
            console.log("end");
        });
    });
});

// Recieve contet ids from salesforce
app.post('/test', function(req, res) {
    var message = 'ERROR';
    docIds = req.body;
    console.log('attachments ids+++++++++ ', docIds);
    if (docIds) {
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

// BASE 64 FUNCTIONS
// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString('base64');
}

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
    // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
    var bitmap = new Buffer(base64str, 'base64');
    // write buffer to file
    fs.writeFileSync(file, bitmap);
    console.log('******** File created from base64 encoded string ********');
}
