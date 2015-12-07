module.exports = {
    getRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = process.env.DATABASE_URL || "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("select * from employee");
        query.on("row", function (row, result) {
            result.addRow(row);
        });
        query.on("end", function (result) {
            client.end();
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(result.rows, null, "    ") + "\n");
            res.end();
        });
    },
    addRecord : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL ||  "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("insert into login_data (accessToken, refreshToken, instanceUrl) "+
                                "values ('"+req.query.aT+"','"+req.query.rT+"','"+
                                    req.query.iUrl+"')");
                                    
        query.on("end", function (result) {
            client.end();
            res.write('Success');
            res.end();
        });
    },
     delRecord : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL ||  "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query( "Delete from loggin_data Where id ="+req.query.id);
        query.on("end", function (result) {
            client.end();
            res.write('Success');
            res.end();
        });
    },
    createTable: function(req, res) {
        console.log('asdfasdfadsfasd');
        var pg = require('pg');
        var conString = process.env.DATABASE_URL ||  "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query( "CREATE TABLE loggin_data"+
                                    "("+
                                      "access_token character varying(200),"+
                                      "refresh_token character varying(200),"+
                                      "instanceUrl character varying(200),"+
                                      "mobile character varying(12),"+
                                      "id serial NOT NULL"+
                                    ")");
        query.on("end", function (result) {
            client.end();
            res.write('Table Schema Created');
            res.end();
        });
    },
    dropTable : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL || "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query( "Drop TABLE loggin_data");
        query.on("end", function (result) {
            client.end();
            res.write('Table Schema Deleted');
            res.end();
        });
    }
};
