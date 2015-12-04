module.exports = {
    getRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = process.env.DATABASE_URL || "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
        var login_data = new pg.Client(conString);
        login_data.connect();
        var query = login_data.query("select * from login_data");
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
        var conString = process.env.DATABASE_URL || "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
        var login_data = new pg.Client(conString);
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
        var conString = process.env.DATABASE_URL || "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
        var login_data = new pg.Client(conString);
        login_data.connect();
        var query = login_data.query( "Delete from login_data Where id ="+req.query.id);
        query.on("end", function (result) {
            login_data.end();
            res.write('Success');
            res.end();
        });
    },
    createTable : function(req, res){
        console.log('logiin url database ');
        var pg = require('pg');
        var conString = process.env.DATABASE_URL || 'postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8';
        var loggin_data = new pg.Client(conString);
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
        var conString = process.env.DATABASE_URL || "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
        var login_data = new pg.Client(conString);
        login_data.connect();
        var query = login_data.query( "Drop TABLE login_data");
        query.on("end", function (result) {
            login_data.end();
            res.write('Table Schema Deleted');
            res.end();
        });
    }
};
