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
    clientId : '3MVG91ftikjGaMd_epnylI.6EF_WhqQrAp3oUSc6wIgZi_3gCb4HdvdKjBbwQ6mczNvink75zl.0g7b.Txfx4',
    clientSecret : '2418598885995816946',
    redirectUri : 'https://jotapi.herokuapp.com/callback'
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
            // Fetch attachments to procees in zip
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
            var query = 'SELECT Id, Title, ContentSize, VersionData FROM ContentVersion';
            // open connection with client's stored OAuth details
            conn = new sf.Connection({
                instanceUrl: req.session.instanceUrl,
                accessToken: req.session.accessToken
            });
            //|| result.records[i].Id == '06815000001WYEgAAO'
            // First query on documents then into content documents to retrieve the file
            conn.query(query, function(err, result) {
                if (err) {
                    return console.error('Document query error: ', err);
                } else {
                    if (result.done && result.records.length > 0) {
                        var pdfs = [];
                        // Hack to test with selected pdf
                        // for (var i=0; i < result.records.length; i++) {
                            // if (result.records[i].Id == '06815000001WYEbAAO' || result.records[i].Id == '06815000001WYElAAO') {
                            //     console.log('el titulooooooooo ', result.records[i].Title);
                            //     pdfs.push(result.records[i]);
                            //
                            // }
                        // }

                        if (pdfs.length == 0) {
                            pdfs = result.records;
                        }
                        req.session.pdf_results = pdfs;
                        // get pdf from salesforce to process
                        res.redirect('/getpdf');
                    }
                }
            });
        } else {
            res.write('NO ATTACHMENTS IN THIS DOCUMENT  ');
            res.end();
        }
    }
});

app.get('/getpdf', function(request, response) {
    // Variables
    var zip = archiver.create('zip', {});
    var output = fs.createWriteStream('outputZip.zip');
    var count = 0;
    var file;
    
    var options = {
        hostname: 'na22.salesforce.com',
        path: '',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + request.session.accessToken
        }
    };

    // Bind zip to output
    zip.pipe(output);
    //PDF List
    var pdfListWrapper = [];
    
    //console.log( request.session.pdf_results );
    var lista = request.session.pdf_results;
    
    for (var i=0, size= lista.length; i < size; i++){
    	var pdf = lista[i];
    	pdfListWrapper.push(
    			function(callback){
    				
    				options.path = pdf.VersionData;
	                title_pdf = pdf.Title;
    				
    				var req = http.request(options, function(res) {
    		            file = fs.createWriteStream(title_pdf);
    		            res.on('data', function (chunk) {
    		                file.write(chunk);
    		            });
    		            res.on('end', function() {
    		                file.end();
    		                callback(null,file);
    		            });
    		            res.on('error',function(error){
    		            	callback(error);
    		            });
    		        });    				
    			}
		);
    }
    
    async.series(pdfListWrapper,
              // optional callback
              function(err, results){
			    	results.each(function(pdf){
			    		var random_integer = Math.random()*101|0;
			    		zip.append(fs.createReadStream(pdf), { name : 'anotherTest'+random_integer });
			    	})
			        zip.finalize();
		    		req.end();
			        response.redirect('/postchatter');
              });
});

app.get('/postchatter', function(request, response) {
    var options = {
      hostname: 'na22.salesforce.com',
      path: '/services/data/v34.0/chatter/feed-elements',
      method: 'POST',
      headers: {
          'Content-Type': 'multipart/form-data; boundary=a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq',
          'Authorization': 'OAuth ' + request.session.accessToken
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
        //   res.write('Check Chatter to see message');
        console.log('ES EL FIN*****');
        });
    });

    req.on('end', function() {
        console.log('el final ha llegado');
    });

    // If error show message and finish response
    req.on('error', function(e) {
        response.write('Error in request, please retry or contact your Administrator');
        response.end();
    });

    req.on('response', function(res) {
        response.write('SUCCESS: Check Chatter to find the ZIP file :)');
        response.end();
    });

    // write data to request body
    req.write(postData);

    fs.createReadStream('outputZip.zip')
        .on('end', function() {
            req.end(CRLF + '--a7V4kRcFA8E79pivMuV2tukQ85cmNKeoEgJgq--' + CRLF);
        })
        .pipe(req, {end:false});
});

// Recieve contet ids from salesforce
app.post('/test', function(req, res) {
    var message = 'ERROR';
    docIds = req.body;
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
