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
        var query = client.query("insert into employee (firstName,lastName,email,mobile) "+
                                "values ('"+req.query.fName+"','"+req.query.lName+"','"+
                                    req.query.email+"','"+req.query.mbl+"')");
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
        var query = client.query( "Delete from employee Where id ="+req.query.id);
        query.on("end", function (result) {
            client.end();
            res.write('Success');
            res.end();
        });
    },
    // createTable : function(req, res){
    //     var pg = require('pg');
    //     console.log('dasdadadadadada');
    //     var conString = process.env.DATABASE_URL;
    //     var client = new pg.Client(conString);
    //     client.connect();
    //     console.log('rrrrrrrrrrrrrr');
    //     var query = client.query( "CREATE TABLE employee"+
    //                                 "("+
    //                                   "firstname character varying(50),"+
    //                                   "lastname character varying(20),"+
    //                                   "email character varying(30),"+
    //                                   "mobile character varying(12),"+
    //                                   "id serial NOT NULL"+
    //                                 ")");
    //     console.log('waaaaaaaaa';)
    //     query.on("end", function (result) {
    //         client.end();
    //         res.write('Table Schema Created');
    //         res.end();
    //     });
    // },
    createTable: function() {
        var pg = require('pg');
        var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/todo';

        var client = new pg.Client(connectionString);
        client.connect();
        var query = client.query('CREATE TABLE items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
        query.on('end', function() { client.end(); });
    },
    dropTable : function(req, res){
        var pg = require('pg');
        var conString = process.env.DATABASE_URL || "postgres://postgres:Welcome123@localhost:5432/postgres";
        var client = new pg.Client(conString);
        client.connect();
        var query = client.query( "Drop TABLE employee");
        query.on("end", function (result) {
            client.end();
            res.write('Table Schema Deleted');
            res.end();
        });
    }
};
