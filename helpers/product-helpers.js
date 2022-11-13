var db = require('../config/connection')
var collection = require('../config/collection')
const { response } = require('../app')
const { ObjectID } = require('bson')
var objectId = require('mongodb').ObjectId

module.exports = {

    addProduct: (product) => {
        return new Promise(async (resolve, reject) => {
            product.offerprice = product.price
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
                    console.log('add product done');
                    resolve(data.insertedId)
                    //console.log(data.insertedId);
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
                resolve(products.reverse())
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                    //console.log(response);
                    resolve(response)
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                    resolve(product)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getCategoryname: (proId) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then(async (product) => {
                    let catInProduct = product.category;
                    await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(catInProduct) }).then((category) => {
                        resolve(category)
                    }).catch((err) => {
                        reject(err)
                    })
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    updateproduct: (productId, productDetails) => {
        return new Promise((resolve, reject) => {
            try {
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
                    }).catch((err) => {
                        reject(err)
                    })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getUser: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.USER_COLLECTIONS).find().toArray()
                resolve(user)
            } catch (err) {
                console.log(err);
                reject(err)
            }
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
            try {
                let datacategory = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
                console.log(datacategory);
                resolve(datacategory)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getProductsInCategory: (Cate) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).find({ category: Cate }).toArray().then((product) => {  //ask       
                    console.log(Cate)
                    console.log(product)
                    resolve(product)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    addCategory: (cat) => {
        return new Promise(async (resolve, reject) => {
            try {
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
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    deleteCategory: (catId) => {
        return new Promise(async (resolve, reject) => {
            try {
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
                        }).catch((err) => {
                            reject(err)
                        })
                    }
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getOneCatergory: (catOne) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.CATEGORY_COLLECTION).findOne({ categories: catOne }).then((catOne) => {
                    resolve(catOne)
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    editCategory: (catname, cat) => {
        return new Promise(async (resolve, reject) => {
            try {
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
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    changeOrderStatus: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(details.order) }, {
                    $set: {
                        status: details.stat
                    }
                }).then(async (response) => {
                    resolve(response);
                    // await db.get().collection.
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    changeOrderStatustoCancel: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
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
                }).catch((err) => {
                    reject(err)
                })


                console.log('cancell parupadi');
                console.log(userId);
                let prod = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(details.order) }, {
                    projection: { 'products.item': true, 'products.quantity': true }
                })
                console.log("----item and quantity----")
                console.log(prod.products);
                let prodArr = prod.products
                prodArr.forEach(async (element) => {
                    let quan = element.quantity
                    await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(element.item) }, [
                        {
                            $set: { stock: { $add: ['$stock', quan] } }
                        }
                    ])
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    addCoupon: async (CouponDetails) => {
        console.log(CouponDetails.coupon);
        return new Promise(async (resolve, reject) => {
            try {
                const couponexist = await db.get().collection(collection.OFFER_COLLECTION).findOne({ coupon: CouponDetails.coupon })
                couponAlreadyexist = false;
                if (couponexist) {
                    couponAlreadyexist = true;
                    resolve(couponAlreadyexist)
                }
                else {
                    return new Promise(async (resolve, reject) => {
                        await db.get().collection(collection.OFFER_COLLECTION).insertOne(CouponDetails)
                        couponAlreadyexist = false;
                        console.log(couponAlreadyexist);
                        resolve(couponAlreadyexist)
                    })
                }
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getCouponCode: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let coupon = await db.get().collection(collection.OFFER_COLLECTION).find().toArray()
                resolve(coupon)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    addCategoryOffer: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                let unique = await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).findOne({ category: details.category })
                if (unique) {
                    offerAlreadyexist = true;
                    resolve(offerAlreadyexist)
                } else {
                    offerAlreadyexist = false;
                    await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).insertOne(details)
                    let percent = parseInt(details.offerpercent)

                    await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ category: details.category }, [
                        {
                            $set: { offerprice: { $subtract: ['$price', { $floor: { $multiply: [{ $divide: [percent, 100] }, '$offerprice'] } }] } }
                        }
                    ])
                }
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getCategoryOffer: () => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).find({ type: "category" }).toArray().then((response) => {
                    resolve(response)
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    deleteCoupon: (couponId) => {
        return new Promise(async (resolve, reject) => {
            try {
                db.get().collection(collection.OFFER_COLLECTION).deleteOne({ "_id": objectId(couponId.couponId) }).then(() => {
                    resolve({ removeCoupon: true })
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    deleteOffer: (offerId) => {
        return new Promise(async (resolve, reject) => {
            try {
                db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).deleteOne({ "_id": objectId(offerId.offerId) }).then(() => {
                    resolve({ removeOffer: true })
                }).catch((err) => {
                    reject(err)
                })
                await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ category: offerId.category }, [
                    {
                        $set: { offerprice: '$price' }
                    }
                ])
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    addProductOffer: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).insertOne(details)
                resolve(details)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getAllproductOffer: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let proOffer = await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).find({ type: "product" }).toArray()
                console.log(proOffer);
                resolve(proOffer)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    productOfferApplied: (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                let appliedOffer = await db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).findOne({ offerName: details.offerId })
                let percentage = parseInt(appliedOffer.offerpercent)
                let name = appliedOffer.offerName
                await db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ _id: objectId(details.proId) },
                    [
                        {
                            $set: {
                                offerprice: { $subtract: ["$price", { $floor: { $multiply: [{ $divide: [percentage, 100] }, "$price"] } }] },
                                offerName: name
                            }
                        }
                    ])
                console.log('done');
                resolve(response)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    deleteProductOffer: (details) => {
        console.log('222');
        console.log(details);
        console.log(details.name);
        return new Promise(async (resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).updateMany({ offerName: details.name }, [
                    {
                        $set: { offerprice: '$price' }
                    },
                    {
                        $unset: ['offerName']
                    }
                ])

                db.get().collection(collection.OFFER_MANAGEMENT_COLLECTION).deleteOne({ _id: objectId(details.offerId) }).then(() => {
                    resolve({ status: true })
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getProductStock: async (details) => {
        return new Promise(async (resolve, reject) => {
            try {
                let stock = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(details.product) })
                resolve(stock.stock)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getProductCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments()
                resolve(count)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getOrderCount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(collection.ORDER_COLLECTION).countDocuments()
                resolve(count)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },
    getPaginatedProducts: (skip, limit) => {
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().skip(skip).limit(limit).toArray()
                resolve(products.reverse())
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getSearchProducts: (search) => {
        console.log('helpers search');
        console.log(search);
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({
                    $or: [
                        {
                            name: { $regex: ".*" + search + ".*", $options: "i" }
                        },
                        {
                            category: { $regex: ".*" + search + ".*", $options: "i" }
                        }
                    ]
                }).toArray()
                console.log(products);
                resolve(products)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    addBanner: (bannerImg) => {
        return new Promise(async (resolve, reject) => {
            try {
                db.get().collection(collection.BANNER_COLLECTION).insertOne(bannerImg).then((data) => {
                    console.log('add banner');
                    console.log(data);
                    console.log(data.insertedId);
                    resolve(data.insertedId)
                }).catch((err) => {
                    reject(err)
                })
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

    getBanner: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let banner = db.get().collection(collection.BANNER_COLLECTION).find().toArray()
                resolve(banner)
            } catch (err) {
                console.log(err);
                reject(err)
            }
        })
    },

}
