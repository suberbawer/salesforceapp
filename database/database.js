module.exports = {
    addRecord : function(user_id, access_token, refresh_token, instance_url) {
        var pg = require('pg');
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("INSERT INTO loggin_data(user_id, access_token, refresh_token, instance_url) values($1, $2, $3, $4)", [user_id, access_token, refresh_token, instance_url]);

        query.on("end", function (result) {
            client.end();
        });
    },
    updateRecord : function(user_id, access_token, refresh_token, instance_url) {
        var pg = require('pg');
        var conString = 'postgres://rptskpfekwvldg:A2i0A8XHAl_UZoP6EnxD-G39Ik@ec2-107-22-170-249.compute-1.amazonaws.com:5432/d3l0qan6csusdv';
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query("UPDATE loggin_data SET access_token = ($1), refresh_token = ($2), instance_url = ($3) WHERE user_id = ($4)", [access_token, refresh_token, instance_url, user_id]);

        query.on("end", function (result) {
            client.end();
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
                                        "user_id VARCHAR (220),"+
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
