var db = require('../config/connection')
var collection = require('../config/collection')
const { response } = require('../app')
const { ObjectID } = require('bson')
var objectId = require('mongodb').ObjectId

module.exports = {

    addProduct: (product) => {
        return new Promise(async (resolve, reject) => {
            //user.password=await bcrypt.hash(user.password,10)
            product.offerprice=product.price
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                console.log('add product done');
                resolve(data.insertedId)
                //console.log(data.insertedId);
            })
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products.reverse())
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                //console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    getCategoryname: (proId) => {
        return new Promise(async (resolve, reject) => {
            // console.log('error ivide2');
            await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then(async (product) => {
                let catInProduct = product.category;
                //  console.log(catInProduct);
                //  console.log('error ivide3');
                await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(catInProduct) }).then((category) => {
                    console.log('error ivide4');
                    console.log(category);  //output null
                    console.log("category name get cheythu");
                    resolve(category)
                })
            })
        })
    },
    updateproduct: (productId, productDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(productId) }, {

                    $set: {
                        name: productDetails.name,
                        Category: productDetails.Category,
                        price: productDetails.price,
                        description: productDetails.description,
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getUser: () => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTIONS).find().toArray()
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

    getCategory: () => {
        return new Promise(async (resolve, reject) => {
            let datacategory = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            console.log(datacategory);
            resolve(datacategory)
        })
    },
    getProductsInCategory: (Cate) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).find({ category: Cate }).toArray().then((product) => {  //ask       
                console.log(Cate)
                console.log(product)
                resolve(product)
            })
        })
    },
    addCategory: (cat) => {
        return new Promise(async (resolve, reject) => {
            let categoryData = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categories: cat.categories })
            console.log(categoryData);
            if (categoryData) {
                categoryData.exist = true
                resolve(categoryData)
            } else {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(cat).then((data) => {
                    resolve(data)
                    console.log(data);
                })
            }

        })
    },
    deleteCategory: (catId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categories: catId }).then(async () => {
                console.log(catId);
                let CatDelete = await db.get().collection(collection.PRODUCT_COLLECTION).find({ category: catId }).toArray()
                let resolveObject = { category: catId }
                console.log(CatDelete);
                if (CatDelete.length > 0) {
                    resolveObject.DeleteStatus = false;
                    resolve(resolveObject)
                } else {
                    db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ categories: catId }).then((response) => {
                        resolveObject.DeleteStatus = true;
                        resolve(resolveObject)
                    })
                }
            })
        })
    },
    getOneCatergory: (catOne) => {
        return new Promise((resolve, reject) => {
            console.log(2);
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categories: catOne }).then((catOne) => {
                resolve(catOne)
            })
        })
    },
    editCategory: (catname, cat) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ category: cat }, {
                $set: {
                    category: catname
                }
            }).then(() => {
                db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ categories: cat }, {
                    $set: {
                        categories: catname
                    }
                })

            }).then(() => {
                resolve()
            })
        })
    },
    changeOrderStatus: (details) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(details.order) }, {
                $set: {
                    status: details.stat
                }
            }).then(async (response) => {
                resolve(response);
                // await db.get().collection.
            })
        })
    },
    changeOrderStatustoCancel: (details) => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: objectId(details.order) }).toArray()
            let userId = order[0].userId;
            let total = order[0].totalAmount
            let date = new Date().toLocaleString('en-US')
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ user: userId }, {
                $inc: { amount: total },
                $push: {
                    transactions: {
                        transactiondescription: 'product cancelled',
                        transactionAmount: total,
                        type: 'Credited',
                        transactionDate: date
                    }
                }
            })

            await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(details.order) }, {
                $set: {
                    status: 'cancelled',
                }
            }).then((response) => {
                console.log('find user id');
                console.log(response);
                resolve(response)
            })
        })
    },

    addCoupon: async (CouponDetails) => {
        console.log(CouponDetails.coupon);
        return new Promise(async (resolve, reject) => {
            const couponexist = await db.get().collection(collection.OFFER_COLLECTION).findOne({ coupon: CouponDetails.coupon })
            couponAlreadyexist = false;
            if (couponexist) {
                couponAlreadyexist = true;
                resolve(couponAlreadyexist)
            }
            else {
                return new Promise(async(resolve, reject) => {
                    await db.get().collection(collection.OFFER_COLLECTION).insertOne(CouponDetails).then(() => {
                        console.log('2');
                        resolve()
                    })
                    couponAlreadyexist = false;
                    console.log(couponAlreadyexist);
                    resolve(couponAlreadyexist)
                })
            }
        })
    },

    getCouponCode: () => {
        return new Promise(async (resolve, reject) => {
            let coupon = await db.get().collection(collection.OFFER_COLLECTION).find().toArray()
            resolve(coupon)
        })
    },

    addCategoryOffer:(details) =>{
        return new Promise(async(resolve,reject)=>{
            console.log('1234556');
            let unique=await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).findOne({category:details.category})
            console.log(unique);
            if(unique){
                offerAlreadyexist = true;
                resolve(offerAlreadyexist)
            }else{
                offerAlreadyexist = false;
                let offer=await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).insertOne(details)
                console.log('implemetn');
               let percent=parseInt(details.offerpercent)

                resolve(offer)
                await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({category:details.category},[
                    {
                        $set:{offerprice:{$subtract:['$price',{$floor:{$multiply:[{$divide:[percent,100]},'$offerprice']}}]}}
                    }
                ])
            }   
        })
    },

    getCategoryOffer:()=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).find({type:"category"}).toArray().then((response)=>{
                resolve(response)
            })
        })
    },

    deleteCoupon:(couponId)=>{
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.OFFER_COLLECTION).deleteOne({"_id":objectId(couponId.couponId)}).then(()=>{
                resolve({ removeCoupon: true })
            })
        })
    },

    deleteOffer:(offerId)=>{
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).deleteOne({"_id":objectId(offerId.offerId)}).then(()=>{
                resolve({ removeOffer: true })
            })
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({category:offerId.category},[
                {
                    $set:{offerprice:'$price'}
                }
            ])
        })
    },

    addProductOffer:(details)=>{
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).insertOne(details)
            resolve(details)
        })
    },

    getAllproductOffer:()=>{
        return new Promise(async(resolve,reject)=>{
            let proOffer=await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).find({type:"product"}).toArray()
            console.log(proOffer);
            resolve(proOffer)
        })
    },

    productOfferApplied:(details)=>{
        return new Promise(async(resolve,reject)=>{
            let appliedOffer=await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).findOne({offerName:details.offerId})
            let percentage=parseInt(appliedOffer.offerpercent)
            let name=appliedOffer.offerName
            await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({_id:objectId(details.proId)},
            [
                {
                  $set: { 
                        offerprice: {$subtract: ["$price",{$floor: {$multiply: [{$divide:[percentage,100]},"$price"]}}]},
                        offerName:name
                    }
                }
            ])
            console.log('done');
            resolve(response)
        })
    },

    deleteProductOffer:(details)=>{
        console.log('222');
        console.log(details);
        console.log(details.name);
        return new Promise(async(resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateMany({offerName:details.name},[
                {
                    $set:{offerprice:'$price'}
                },
                {
                    $unset:['offerName']
                }
            ])

            db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).deleteOne({_id:objectId(details.offerId)}).then(()=>{
                resolve({status:true})
            })
        })
    }
}
