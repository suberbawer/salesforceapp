module.exports = {
    addRecord : function(user_id, access_token, refresh_token, instance_url, salesforce_version) {
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("INSERT INTO loggin_data(user_id, access_token, refresh_token, instance_url, salesforce_version) values($1, $2, $3, $4, $5)", [user_id, access_token, refresh_token, instance_url, salesforce_version]);

        query.on("end", function (result) {
            client.end();
        });
    },
    readRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = process.env.DATABASE_URL;
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
            return res.json(results);
        }
    },
    updateRecord : function(user_id, access_token, refresh_token, instance_url, salesforce_version) {
        var pg = require('pg');
        var conString = process.env.DATABASE_URL;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("UPDATE loggin_data SET access_token = ($1), refresh_token = ($2), instance_url = ($3), salesforce_version = ($5) WHERE user_id = ($4)", [access_token, refresh_token, instance_url, user_id, salesforce_version]);

        query.on("end", function (result) {
            client.end();
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
                                        "user_id VARCHAR (220),"+
                                        "access_token VARCHAR (220),"+
                                        "refresh_token VARCHAR (220),"+
                                        "instance_url VARCHAR (220),"+
                                        "salesforce_version SMALLINT,"+
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
