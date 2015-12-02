var sf = require('node-salesforce');
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


var oauth2 = new sf.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : '3MVG9KI2HHAq33RwhxMVCRBe6dPIkfPSR1aQ1yyIPMtuCSZnKT5_XBo.lHvzHDuqQq4RhGKIqAhR2aYM2yCO2',
  clientSecret : '3102684591552334404',
  redirectUri : 'https://salesforceapi.herokuapp.com'
});
//
// Get authz url and redirect to it.
//
app.get('/oauth2/auth', function(req, res) {
  res.redirect(oauth2.getAuthorizationUrl({ scope : 'api id web' }));
});
