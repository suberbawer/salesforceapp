module.exports = {
    getRecords: function() {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
        var f_result = new Object;
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("select * from loggin_data");
        var result = [];

        query.on("row", function (row) {
            result.push(row);
        });

        query.on("end", function () {
            //client.end();
            done();
            console.log('EL PRIMER RESULTADO', result[0]);
            return result;
        });
    },
    addRecord : function(access_token, refresh_token, instance_url) {
        var pg = require('pg');
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("INSERT INTO loggin_data(access_token, refresh_token, instance_url) values($1, $2, $3)", [access_token, refresh_token, instance_url]);

        query.on("end", function (result) {
            client.end();
            // res.write('Success');
            // res.end();
        });
    },
     delRecord : function(req, res){
        var pg = require('pg');
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
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
        console.log('LA DATA URL---', process.env.DATABASE_URL);
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
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
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
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
