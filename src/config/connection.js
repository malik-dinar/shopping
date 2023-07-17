const mongoClient = require('mongodb').MongoClient
const state={
    db:null
}
let uri = 'mongodb+srv://malik:123@cluster0.gzoa8sc.mongodb.net/?retryWrites=true&w=majority'
module.exports.connect=function(done){                    
    const url = uri;
    const dbname = 'shopping';
    
    mongoClient.connect(url,(err,data)=>{
          if(err) return done(err)
          state.db=data.db(dbname)
          done()
      });
}

module.exports.get=function(){
    return state.db
}

