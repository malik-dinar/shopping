var db=require('../config/connection')
var collection=require('../config/collection')
const { response } = require('../app')
var objectId=require('mongodb').ObjectId

module.exports={

    addProduct:(product)=>{
        return new Promise(async(resolve,reject)=>{
            //user.password=await bcrypt.hash(user.password,10)
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data)=>{
                console.log('add product done');
            resolve(data.insertedId)
           //console.log(data.insertedId);
        })
        
       })
    // addProduct:(user,callback)=>{
    //        //console.log(user);
    //         db.get().collection('user').insertOne(user).then((error,data)=>{
    //             console.log(data);
    //             callback(data)
    //         })
    },
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)   
        })
    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
                //console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
                resolve(product)
            })
        })
    },
    getCategoryname:(proId)=>{
        return new Promise(async(resolve,reject)=>{
            // console.log('error ivide2');
             await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then(async(product)=>{
              let catInProduct=product.category;
            //  console.log(catInProduct);
            //  console.log('error ivide3');
             await db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(catInProduct)}).then((category)=>{
                console.log('error ivide4');
                console.log(category);  //output null
                console.log("category name get cheythu");
                resolve(category)
             })   
            })
        })
    },
    updateproduct:(productId,productDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:objectId(productId)},{

                $set:{
                    name:productDetails.name,
                    Category:productDetails.Category,
                    price:productDetails.price,
                    description:productDetails.description,      
                }
            }).then((response)=>{
                resolve()
            })
        })
    },
    getUser:()=>{
        return new Promise(async(resolve,reject)=>{
            let user=await db.get().collection(collection.USER_COLLECTIONS).find().toArray()
            resolve(user)   
        })
    },
    // getCategory:()=>{
    //     return new Promise((resolve,reject)=>{
    //         db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(category)}).then((datacategory)=>{
    //             resolve(datacategory)
    //         })
    //     })
    // },

    getCategory:()=>{
        return new Promise(async(resolve,reject)=>{
            let datacategory=await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray() 
            console.log(datacategory);
            resolve(datacategory)   
        })
    },
    getProductsInCategory:(Cate)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).find({category:Cate}).toArray().then((product)=>{  //ask       
                console.log(Cate)
                console.log('inbetween');
                console.log(product)
                resolve(product)
            })
        })
    },
    addCategory:(cat)=>{
        return new Promise(async(resolve,reject)=>{
            let categoryData=await db.get().collection(collection.CATEGORY_COLLECTION).findOne({categories:cat.categories})
            console.log(categoryData); 
            if(categoryData){
                categoryData.exist=true
                resolve(categoryData)
            }else{
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(cat).then((data)=>{
                resolve(data)
                console.log(data);
                })       
            }    
            
       })
    },
    deleteCategory:(catId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.CATEGORY_COLLECTION).findOne({categories:catId}).then(async()=>{
                console.log(catId);
                let CatDelete=await db.get().collection(collection.PRODUCT_COLLECTION).find({category:catId}).toArray()
                let resolveObject={category:catId}
                console.log(CatDelete);
                if(CatDelete.length>0){
                    resolveObject.DeleteStatus=false;
                    resolve(resolveObject)     
                }else{
                    db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({categories:catId}).then((response)=>{
                        resolveObject.DeleteStatus=true;
                        resolve(resolveObject)
                    })
                }
            })
        })
    },
    getOneCatergory:(catOne)=>{
        return new Promise((resolve,reject)=>{
            console.log(2);
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({categories:catOne}).then((catOne)=>{
                resolve(catOne)
            })
        })
    },
    editCategory: (catname,cat)=>{
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ category: cat },{
                $set: {
                    category: catname
                }
            }).then(()=>{
                db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ categories: cat }, {
                    $set: {
                        categories: catname
                    }
                })
              
            }).then(()=>{
                resolve()
            })
        })
    },
    changeOrderStatus:(details)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(details.order)},{
                $set:{
                    status: details.stat
                }
            }).then((response)=>{
                resolve(response);
            })
        })
    },
    changeOrderStatustoCancel:(details)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(details.order)},{
                $set:{
                    status:'cancelled'
                }
            }).then((response)=>{
                resolve({status:true})
            })
        })
    }
}