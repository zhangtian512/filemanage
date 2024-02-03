const mysql = require('mysql');

const pool = mysql.createPool({
    host: 'localhost',
    port: "3306",
    user: 'root',
    password: 'admin123',
    database: 'fsd'
});

//导出查询相关  
var query=function(sql,callback){  
    console.log("query")
    pool.getConnection(function(err,conn){
        console.log(err, conn)
        if(err){    
            callback(err,null,null);    
        }else{    
            conn.query(sql,function(qerr,vals,fields){    
                //释放连接    
                // conn.release();    
                pool.releaseConnection(conn);
                //事件驱动回调    
                callback(qerr,vals,fields);    
            });    
        }    
    });    
};


//向外暴露方法
module.exports = {
    pool,
    query
}
