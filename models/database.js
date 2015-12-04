module.exports = {
    getRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = 'postgres://tkunpksswvhgmw:sTvuo7Eb8iO5T5Vy_1WOY3K5Ox@ec2-54-204-40-209.compute-1.amazonaws.com:5432/d97mbunfmhvufm';
        var login_data = new pg.LogginData(conString);
        login_data.connect();
        var query = login_data.query("select id, accessToken, refreshToken, instanceUrl from login_data");
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
            login_data.end();
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(result.rows, null, "    ") + "\n");
            res.end();
        });
    },
    addRecord : function(req, res){
        var pg = require('pg');
        var conString = 'postgres://tkunpksswvhgmw:sTvuo7Eb8iO5T5Vy_1WOY3K5Ox@ec2-54-204-40-209.compute-1.amazonaws.com:5432/d97mbunfmhvufm';
        var login_data = new pg.LogginData(conString);
        login_data.connect();
        var query = login_data.query("insert into login_data (accessToken, refreshToken, instanceUrl) "+
                                "values ('"+req.query.aT+"','"+req.query.rT+"','"+
                                    req.query.iUrl+"')");
        query.on("end", function (result) {
            login_data.end();
            res.write('Success');
            res.end();
        });
    },
     delRecord : function(req, res){
        var pg = require('pg');
        var conString = 'postgres://tkunpksswvhgmw:sTvuo7Eb8iO5T5Vy_1WOY3K5Ox@ec2-54-204-40-209.compute-1.amazonaws.com:5432/d97mbunfmhvufm';
        var login_data = new pg.LogginData(conString);
        login_data.connect();
        var query = login_data.query( "Delete from login_data Where id ="+req.query.id);
        query.on("end", function (result) {
            login_data.end();
            res.write('Success');
            res.end();
        });
    },
    createTable : function(req, res){
        var pg = require('pg');
        var conString = 'postgres://tkunpksswvhgmw:sTvuo7Eb8iO5T5Vy_1WOY3K5Ox@ec2-54-204-40-209.compute-1.amazonaws.com:5432/d97mbunfmhvufm';
        var loggin_data = new pg.LogginData(conString);
        loggin_data.connect();
        var query = loggin_data.query( "CREATE TABLE loggin_data"+
                                    "("+
                                      "accesToken character varying(50),"+
                                      "refreshToken character varying(50),"+
                                      "instanceUrl character varying(50),"+
                                      "id serial NOT NULL"+
                                    ")");
        query.on("end", function (result) {
            loggin_data.end();
            res.write('Table Schema Created');
            res.end();
        });
    },
    dropTable : function(req, res){
        var pg = require('pg');
        var conString = 'postgres://tkunpksswvhgmw:sTvuo7Eb8iO5T5Vy_1WOY3K5Ox@ec2-54-204-40-209.compute-1.amazonaws.com:5432/d97mbunfmhvufm';
        var login_data = new pg.LogginData(conString);
        login_data.connect();
        var query = login_data.query( "Drop TABLE login_data");
        query.on("end", function (result) {
            login_data.end();
            res.write('Table Schema Deleted');
            res.end();
        });
    }
};
