module.exports = {
    getRecords: function(req, res) {
        var pg = require('pg');
        //You can run command "heroku config" to see what is Database URL from Heroku belt
        var conString = "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
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
    pirate: function(req, res) {
        var pg = require('pg');
        pg.connect("postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8", function(err, client, done) {
          client.query('SELECT * FROM login_data', function(err, result) {
            done();
            if (err)
             { console.error(err); response.send("Error " + err); }
            else
             {
                 console.log('*************asdasd ', result.rows);
            }
          });
        });


    },

    addRecord : function(req, res){
        var pg = require('pg');
        var conString = "postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8";
        var login_data = new pg.Client(conString);
        login_data.connect();
        console.log('*************asdasd ', req.query.aT);
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
        var pg = require('pg');
        var conString = process.env.DATABASE_URL || 'postgres://kobwxuzwrdnfbw:c8BBmA8e6B8euXT02JEmMvVTft@ec2-54-197-247-170.compute-1.amazonaws.com:5432/d3cdt1vo5k63j8';
        var loggin_data = new pg.Client(conString);
        loggin_data.connect();
        var query = loggin_data.query( "CREATE TABLE loggin_data"+
                                    "("+
                                      "accesToken charvar(200),"+
                                      "refreshToken charvar(200),"+
                                      "instanceUrl charvar(200),"+
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
