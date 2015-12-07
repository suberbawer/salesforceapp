module.exports = {
    getRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = process.env.DATABASE_URL;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("select * from loggin_data");
        var aux;
        // var results = [];

        query.on("row", function (row, result) {
            result.addRow(row);
        });

        query.on("end", function (result) {
            client.end();
            // res.writeHead(200, {'Content-Type': 'text/plain'});
            // res.write(JSON.stringify(result.rows, null, "    ") + "\n");
            res.end();
            if (res.json(result.row) == undefined) {
                var url = '/db/addRecord?aT=' + aT + '&iUrl=' + iUrl + '&rT=' + rT;
                res.redirect(url);
            } else {
                res.redirect('/accounts');
                // res.json(result.row).access_token;
                // res.json(result.row).instance_url;
            }
        });
    },
    addRecord : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("INSERT INTO loggin_data(access_token, refresh_token, instance_url) values($1, $2, $3)", [req.query.aT, req.query.rT, req.query.iUrl]);

        query.on("end", function (result) {
            client.end();
            res.write('Success');
            res.end();
        });
    },
     delRecord : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
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
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query( "CREATE TABLE loggin_data"+
                                    "("+
                                      "access_token VARCHAR (220),"+
                                      "refresh_token VARCHAR (220),"+
                                      "instance_url VARCHAR (220),"+
                                      "id serial PRIMARY KEY NOT NULL"+
                                    ")");

        query.on("end", function (result) {
            client.end();
            res.write('Table Schema Created');
            res.end();
        });
    },
    dropTable : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
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
